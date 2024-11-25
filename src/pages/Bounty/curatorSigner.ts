import { bounty$ } from "@/state/bounties";
import { getLinkedSigner$ } from "@/state/linkedSigners";
import { state } from "@react-rxjs/core";
import { of, switchMap } from "rxjs";

export const bountyCuratorSigner$ = state(
  (id: number) =>
    bounty$(id).pipe(
      switchMap((v) =>
        v?.status.value && "curator" in v.status.value
          ? getLinkedSigner$(v.status.value.curator)
          : of(null)
      )
    ),
  null
);
