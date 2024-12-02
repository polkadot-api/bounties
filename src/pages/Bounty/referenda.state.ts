import { typedApi } from "@/chain";
import { getReferendaSdk } from "@/sdk/referenda-sdk";
import { state } from "@react-rxjs/core";
import { defer, map } from "rxjs";

const referendaSdk = getReferendaSdk(typedApi);

const spenderOrigins = [
  "Treasurer",
  "SmallSpender",
  "MediumSpender",
  "BigSpender",
  "SmallTipper",
  "BigTipper",
];

export const spenderReferenda$ = state(
  defer(referendaSdk.getOngoingReferenda).pipe(
    map((v) =>
      v.filter(
        (ref) =>
          (ref.origin.type === "Origins" &&
            spenderOrigins.includes(ref.origin.value.type)) ||
          (ref.origin.type === "system" && ref.origin.value.type === "Root")
      )
    )
  )
);
