import { typedApi } from "@/chain";
import { PolkadotRuntimeOriginCaller } from "@polkadot-api/descriptors";
import { state } from "@react-rxjs/core";
import { Binary, FixedSizeBinary } from "polkadot-api";
import {
  defer,
  EMPTY,
  filter,
  from,
  map,
  mergeAll,
  mergeMap,
  of,
  switchMap,
  tap,
  toArray,
} from "rxjs";

const spenderReferenda$ = defer(
  typedApi.query.Referenda.ReferendumInfoFor.getEntries
).pipe(
  mergeAll(),
  map((r) => ({ ...r.value, id: r.keyArgs[0] })),
  filter((v) => v.type === "Ongoing"),
  map((r) => ({ ...r.value, id: r.id })),
  filter(
    (v) =>
      v.origin.type === "Origins" &&
      [
        "Root",
        "Treasurer",
        "SmallSpender",
        "MediumSpender",
        "BigSpender",
      ].includes(v.origin.value.type)
  ),
  toArray()
);

export const liveReferenda$ = state(
  spenderReferenda$.pipe(
    tap(() => console.log("received referendum list")),
    mergeAll(),
    mergeMap((referendum) => {
      if (referendum.proposal.type === "Legacy") {
        console.log("legacy found");
        return EMPTY;
      }

      if (referendum.proposal.type === "Inline") {
        return of({
          referendum,
          proposal: referendum.proposal.value,
        });
      }

      return getPreimage$(referendum.proposal.value).pipe(
        filter((v) => !!v),
        map((proposal) => ({
          referendum,
          proposal,
        }))
      );
    })
  )
);

export const simulatedReferenda$ = liveReferenda$.pipeState(
  mergeMap(({ referendum, proposal }) =>
    dryRun$(referendum.id, referendum.origin, proposal).pipe(
      map((dryRunResult) => ({
        ...referendum,
        dryRunResult,
      }))
    )
  )
);

const preimageCache: Record<string, Binary | undefined> = {};
const getPreimage$ = (preimage: { hash: FixedSizeBinary<32>; len: number }) => {
  const key = preimage.hash.asHex();
  if (key in preimageCache) {
    return of(preimageCache[key]);
  }
  return from(
    typedApi.query.Preimage.PreimageFor.getValue([preimage.hash, preimage.len])
  ).pipe(
    tap((v) => {
      preimageCache[key] = v;
    })
  );
};

type DryRunResult = Awaited<
  ReturnType<typeof typedApi.apis.DryRunApi.dry_run_call>
>;
const dryRunCache: Record<number, DryRunResult | null> = {};
const dryRun$ = (
  id: number,
  origin: PolkadotRuntimeOriginCaller,
  call: Binary
) => {
  if (id in dryRunCache) {
    return of(dryRunCache[id]);
  }

  return from(typedApi.compatibilityToken).pipe(
    switchMap((token) => {
      try {
        const tx = typedApi.txFromCallData(call, token);
        return typedApi.apis.DryRunApi.dry_run_call(
          origin,
          tx.decodedCall as any
        );
      } catch (ex) {
        console.warn(ex);
        return of(null);
      }
    }),
    tap((v) => {
      dryRunCache[id] = v;
    })
  );
};
