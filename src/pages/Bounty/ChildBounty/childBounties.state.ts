import { typedApi } from "@/chain";
import { getLinkedSigner$ } from "@/state/linkedSigners";
import { createChildBountiesSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { map, of, switchMap, tap } from "rxjs";

export const childBountiesSdk = createChildBountiesSdk(typedApi);

export const childBountyKeys$ = state(
  (parentId: number) =>
    childBountiesSdk
      .watch(parentId)
      .bountyIds$.pipe(tap((v) => console.log("child bounty keys", v))),
  null
);

export const hasActiveChildBounties$ = state(
  (parentId: number) =>
    childBountiesSdk
      .watch(parentId)
      .bounties$.pipe(
        map(
          (v) =>
            Array.from(v.values()).find((child) => child.type === "Active") !=
            null
        )
      ),
  false
);

export const childBounty$ = state(
  (parentId: number, id: number) =>
    childBountiesSdk.watch(parentId).getBountyById$(id),
  null
);

export const childBountyCuratorSigner$ = state(
  (parentId: number, id: number) =>
    childBounty$(parentId, id).pipe(
      switchMap((v) =>
        v?.status.value && "curator" in v.status.value
          ? getLinkedSigner$(v.status.value.curator)
          : of(null)
      )
    ),
  null
);
