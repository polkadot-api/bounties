import { typedApi } from "@/chain";
import { getBountiesSdk } from "@/sdk/bounties-sdk";
import { state } from "@react-rxjs/core";

const bountiesSdk = getBountiesSdk(typedApi);

export const bountyIds$ = state(bountiesSdk.bountyIds$, null);

export const bounty$ = state(bountiesSdk.getBountyById$, null);

export const bountiesState$ = bountyIds$;
