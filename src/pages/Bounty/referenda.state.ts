import { typedApi } from "@/chain";
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
  tap,
  toArray,
} from "rxjs";

const spenderReferenda$ = defer(
  typedApi.query.Referenda.ReferendumInfoFor.getEntries,
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
        "SmallTipper",
        "BigTipper",
      ].includes(v.origin.value.type),
  ),
  toArray(),
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
        })),
      );
    }),
  ),
);

const preimageCache: Record<string, Binary | undefined> = {};
const getPreimage$ = (preimage: { hash: FixedSizeBinary<32>; len: number }) => {
  const key = preimage.hash.asHex();
  if (key in preimageCache) {
    return of(preimageCache[key]);
  }
  return from(
    typedApi.query.Preimage.PreimageFor.getValue([preimage.hash, preimage.len]),
  ).pipe(
    tap((v) => {
      preimageCache[key] = v;
    }),
  );
};
