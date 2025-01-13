import { typedApi } from "@/chain";
import { createBountiesSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { combineLatest, filter, map, mergeMap } from "rxjs";
import { ongoingReferenda$ } from "./referenda";
import { combineKeys } from "@react-rxjs/utils";

export const bountiesSdk = createBountiesSdk(typedApi);
const bountyWatch = bountiesSdk.watchBounties();

export const bountyIds$ = state(
  bountyWatch.bountyIds$.pipe(map((v) => v.reverse())),
  null
);

export const bounty$ = state(bountyWatch.getBountyById$, null);

export const bountiesState$ = combineKeys(
  bountyIds$.pipe(filter(Boolean)),
  bountyWatch.getBountyById$
);

export const bountyApprovingReferenda$ = state(
  (bountyId: number) =>
    combineLatest([
      bounty$(bountyId).pipe(filter(Boolean)),
      ongoingReferenda$,
    ]).pipe(
      mergeMap(([bounty, referenda]) =>
        bounty.type === "Proposed"
          ? bounty.filterApprovingReferenda(referenda)
          : [[]]
      )
    ),
  null
);
export const bountyProposingCuratorReferenda$ = state(
  (bountyId: number) =>
    combineLatest([
      bounty$(bountyId).pipe(filter(Boolean)),
      ongoingReferenda$,
    ]).pipe(
      mergeMap(([bounty, referenda]) =>
        bounty.type === "Funded"
          ? bounty.filterProposingReferenda(referenda)
          : [[]]
      )
    ),
  null
);
