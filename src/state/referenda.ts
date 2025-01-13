import { typedApi } from "@/chain";
import { createReferendaSdk } from "@polkadot-api/sdk-governance";
import { state } from "@react-rxjs/core";
import { defer, repeat } from "rxjs";

export const referendaSdk = createReferendaSdk(typedApi);

export const ongoingReferenda$ = state(
  defer(referendaSdk.getOngoingReferenda).pipe(
    repeat({
      delay: 5 * 60 * 1000,
    })
  )
);
