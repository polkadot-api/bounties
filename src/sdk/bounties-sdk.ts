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
  MultiAddress,
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

  const getDecodedSpenderReferenda = weakMemo(
    async (ongoingReferenda: OngoingReferendum[]) => {
      const spenderReferenda = ongoingReferenda.filter(
        (ref) =>
          (ref.origin.type === "Origins" &&
            spenderOrigins.includes(ref.origin.value.type)) ||
          (ref.origin.type === "system" && ref.origin.value.type === "Root")
      );
      const response = await Promise.all(
        spenderReferenda.map((referendum) =>
          referendum.proposal
            .decodedCall()
            .then((call) => ({
              referendum,
              call,
            }))
            .catch((ex) => {
              console.error(ex);
              return null;
            })
        )
      );
      return response.filter((v) => !!v);
    }
  );

  async function findApprovingReferenda(
    ongoingReferenda: OngoingReferendum[],
    bountyId: number
  ) {
    const spenderReferenda = await getDecodedSpenderReferenda(ongoingReferenda);

    return spenderReferenda
      .filter(({ call }) =>
        findCalls(
          {
            pallet: "Bounties",
            name: "approve_bounty",
          },
          call
        ).some((v) => v?.bounty_id === bountyId)
      )
      .map(({ referendum }) => referendum)
      .filter((v) => v !== null);
  }

  async function findScheduledApproved(bountyId: number) {}

  async function findScheduledCuratorProposed(bountyId: number) {}

  async function findProposingCuratorReferenda(
    ongoingReferenda: OngoingReferendum[],
    bountyId: number
  ) {
    const spenderReferenda = await getDecodedSpenderReferenda(ongoingReferenda);

    return spenderReferenda
      .map(({ call, referendum }) => {
        const proposeCuratorCalls = findCalls(
          {
            pallet: "Bounties",
            name: "propose_curator",
          },
          call
        )
          .filter(
            (v) =>
              v?.bounty_id === bountyId &&
              typeof v.curator === "object" &&
              typeof v.fee === "bigint"
          )
          .map((v) => ({
            curator: v.curator as MultiAddress,
            fee: v.fee as bigint,
          }));
        if (!proposeCuratorCalls.length) return null;
        return { referendum, proposeCuratorCalls };
      })
      .filter((v) => v !== null);
  }

  return {
    bountyIds$,
    getBountyById$,
    referendaFilter: {
      approving: findApprovingReferenda,
      proposingCurator: findProposingCuratorReferenda,
    },
    scheduled: {
      approved: findScheduledApproved,
      curatorProposed: findScheduledCuratorProposed,
    },
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

const findCalls = (call: { pallet: string; name: string }, obj: any): any[] => {
  if (typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    const approves = [];
    for (const item of obj) approves.push(...findCalls(call, item));
    return approves;
  }
  if (obj?.type === call.pallet && obj?.value?.type === call.name) {
    return [obj.value.value];
  }
  const approves = [];
  for (const key of Object.keys(obj))
    approves.push(...findCalls(call, obj[key]));
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
