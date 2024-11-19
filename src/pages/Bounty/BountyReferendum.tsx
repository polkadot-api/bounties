import { typedApi } from "@/chain";
import { Button } from "@/components/ui/button";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { combineLatest, from, mergeMap, ObservedValueOf, scan } from "rxjs";
import { liveReferenda$ } from "./referenda.state";

const approvesBounties = (obj: any): number[] => {
  if (typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    const approves = [];
    for (const item of obj) approves.push(...approvesBounties(item));
    return approves;
  }
  if (
    obj?.type === "Bounties" &&
    obj?.value?.type === "approve_bounty" &&
    typeof obj?.value?.value?.bounty_id === "number"
  ) {
    return [obj.value.value.bounty_id];
  }
  const approves = [];
  for (const key of Object.keys(obj))
    approves.push(...approvesBounties(obj[key]));
  return approves;
};
const bounties$ = state(
  combineLatest([liveReferenda$, from(typedApi.compatibilityToken)]).pipe(
    mergeMap(([{ referendum, proposal }, token]) => {
      try {
        const decodedCall = typedApi.txFromCallData(
          proposal,
          token,
        ).decodedCall;
        const approves = approvesBounties(decodedCall);
        return approves.map(
          (x) => [x, referendum] as [number, typeof referendum],
        );
      } catch (_) {
        return [];
      }
    }),
    scan((acc, [bountyId, referendum]) => {
      const refs = acc.get(bountyId);
      refs == null ? acc.set(bountyId, [referendum]) : refs.push(referendum);
      return acc;
    }, new Map<number, Array<ObservedValueOf<typeof liveReferenda$>["referendum"]>>()),
  ),
  null,
);
export const BountyReferendum: FC<{ id: number }> = ({ id }) => {
  const approvingReferenda = useStateObservable(bounties$)?.get(id);
  return (
    <div className="flex gap-2 p-2 flex-wrap justify-evenly">
      {approvingReferenda == null ? (
        // TODO impl
        <Button>Create referendum to approve bounty</Button>
      ) : (
        // TODO format and maybe some links to subsquare / polkassembly
        <span>
          Approval referendum exists (
          {approvingReferenda.map(({ id }) => id).toString()})
        </span>
      )}
    </div>
  );
};
