import { typedApi } from "@/chain";
import { getBountiesSdk } from "@/sdk/bounties-sdk";
import { state } from "@react-rxjs/core";
import { ongoingReferenda$ } from "./referenda";
import { map, switchMap } from "rxjs";

export const bountiesSdk = getBountiesSdk(typedApi);

export const bountyIds$ = state(
  bountiesSdk.bountyIds$.pipe(map((v) => v.reverse())),
  null
);

export const bounty$ = state(bountiesSdk.getBountyById$, null);

export const bountiesState$ = bountyIds$;

export const bountyApprovingReferenda$ = state(
  (bountyId: number) =>
    ongoingReferenda$.pipe(
      switchMap((referenda) =>
        bountiesSdk.referendaFilter.approving(referenda, bountyId)
      )
    ),
  null
);
export const bountyProposingCuratorReferenda$ = state(
  (bountyId: number) =>
    ongoingReferenda$.pipe(
      switchMap((referenda) =>
        bountiesSdk.referendaFilter.proposingCurator(referenda, bountyId)
      )
    ),
  null
);
