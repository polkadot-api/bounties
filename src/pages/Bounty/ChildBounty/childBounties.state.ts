import { typedApi } from "@/chain";
import { getLinkedSigner$ } from "@/state/linkedSigners";
import { createChildBountiesSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { filter, map, of, switchMap } from "rxjs";

export const childBountiesSdk = createChildBountiesSdk(typedApi);

const watch$ = state((parentId: number) =>
  of(childBountiesSdk.watchChildBounties(parentId))
);

export const childBountyKeys$ = state(
  (parentId: number) => watch$(parentId).pipe(switchMap((w) => w.bountyIds$)),
  null
);

export const hasActiveChildBounties$ = state(
  (parentId: number) =>
    watch$(parentId).pipe(
      switchMap((v) => v.bounties$),
      map((v) =>
        v
          ? Array.from(v.values()).find((child) => child.type === "Active") !=
            null
          : false
      )
    ),
  false
);

export const childBounty$ = state(
  (parentId: number, id: number) =>
    watch$(parentId).pipe(
      switchMap((w) => w.getBountyById$(id)),
      filter((v) => !!v)
    ),
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
