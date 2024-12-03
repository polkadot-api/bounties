import { partitionByKey, toKeySet } from "@react-rxjs/utils";
import { Binary } from "polkadot-api";
import {
  combineLatest,
  from,
  map,
  mergeMap,
  skip,
  startWith,
  switchMap,
} from "rxjs";
import {
  BountiesSdkTypedApi,
  BountyWithoutDescription,
} from "./bounties-descriptors";
import { OngoingReferendum } from "./referenda-sdk";

export interface Bounty extends BountyWithoutDescription {
  description: Binary | null;
}

export function getBountiesSdk(typedApi: BountiesSdkTypedApi) {
  const [getBountyById$, bountyKeyChanges$] = partitionByKey(
    // TODO watchEntries
    typedApi.query.Bounties.BountyCount.watchValue().pipe(
      skip(1),
      startWith(null),
      switchMap(() => typedApi.query.Bounties.Bounties.getEntries()),
      mergeMap((v) => v.sort((a, b) => b.keyArgs[0] - a.keyArgs[0]))
    ),
    (res) => res.keyArgs[0],
    (group$, id) =>
      combineLatest([
        group$,
        from(typedApi.query.Bounties.BountyDescriptions.getValue(id)).pipe(
          startWith(null)
        ),
      ]).pipe(
        map(
          ([bounty, description]): Bounty => ({
            ...bounty.value,
            description: description ?? null,
          })
        )
      )
  );

  const bountyIds$ = bountyKeyChanges$.pipe(
    toKeySet(),
    map((set) => [...set])
  );

  const getBountyReferenda = weakMemo(
    async (ongoingReferenda: OngoingReferendum[]) => {
      const spenderReferenda = ongoingReferenda.filter(
        (ref) =>
          (ref.origin.type === "Origins" &&
            spenderOrigins.includes(ref.origin.value.type)) ||
          (ref.origin.type === "system" && ref.origin.value.type === "Root")
      );
      const referenda = (
        await Promise.all(
          spenderReferenda.map((referendum) =>
            referendum.proposal
              .decodedCall()
              .then((call) => ({
                referendum,
                approves: approvesBounties(call),
              }))
              .catch((ex) => {
                console.error(ex);
                return null;
              })
          )
        )
      ).filter((v) => v !== null);
      const bountyReferenda: Record<number, OngoingReferendum[]> = {};
      referenda.forEach(({ referendum, approves }) => {
        approves.forEach((id) => {
          bountyReferenda[id] ??= [];
          bountyReferenda[id].push(referendum);
        });
      });
      Object.keys(bountyReferenda).forEach((id) => {
        bountyReferenda[Number(id)].sort((a, b) => a.id - b.id);
      });
      return bountyReferenda;
    }
  );
  async function findApprovingReferenda(
    ongoingReferenda: OngoingReferendum[],
    bountyId: number
  ) {
    const bountyReferenda = await getBountyReferenda(ongoingReferenda);
    return bountyReferenda[bountyId] ?? [];
  }

  return {
    bountyIds$,
    getBountyById$,
    findApprovingReferenda,
  };
}

const spenderOrigins = [
  "Treasurer",
  "SmallSpender",
  "MediumSpender",
  "BigSpender",
  "SmallTipper",
  "BigTipper",
];

const approvesBounties = (obj: any): number[] => {
  if (typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    const approves = [];
    for (const item of obj) approves.push(...approvesBounties(item));
    return approves;
  }
  if (
    obj?.type === "Bounties" &&
    obj?.value?.type === "approve_bounty" &&
    typeof obj?.value?.value?.bounty_id === "number"
  ) {
    return [obj.value.value.bounty_id];
  }
  const approves = [];
  for (const key of Object.keys(obj))
    approves.push(...approvesBounties(obj[key]));
  return approves;
};

const weakMemo = <Arg extends [object], R>(fn: (...arg: Arg) => R) => {
  const cache = new WeakMap<Arg[0], R>();
  return (...arg: Arg) => {
    if (cache.has(arg[0])) return cache.get(arg[0])!;
    const result = fn(...arg);
    cache.set(arg[0], result);
    return result;
  };
};
