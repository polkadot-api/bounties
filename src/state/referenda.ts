import { typedApi } from "@/chain";
import { getReferendaSdk } from "@/sdk/referenda-sdk";
import { state } from "@react-rxjs/core";
import { defer } from "rxjs";

const referendaSdk = getReferendaSdk(typedApi);

export const ongoingReferenda$ = state(defer(referendaSdk.getOngoingReferenda));
