import { OngoingReferendum } from "@/sdk/referenda-sdk";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import {
  catchError,
  EMPTY,
  filter,
  from,
  map,
  mergeAll,
  mergeMap,
  toArray,
} from "rxjs";
import { ApproveBountyButton } from "../CreateBounty/AproveBounty";
import { spenderReferenda$ } from "./referenda.state";

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
const approvingReferenda$ = spenderReferenda$.pipeState(
  mergeAll(),
  mergeMap((referendum) =>
    from(referendum.proposal.decodedCall()).pipe(
      map(approvesBounties),
      filter((v) => v.length > 0),
      map((approves) => ({
        referendum,
        approves,
      })),
      catchError((ex) => {
        console.error(ex);
        return EMPTY;
      })
    )
  ),
  toArray()
);
const bountyReferenda$ = approvingReferenda$.pipeState(
  map((referenda) => {
    const bountyReferenda: Record<number, OngoingReferendum[]> = {};
    referenda.forEach(({ referendum, approves }) => {
      approves.forEach((id) => {
        bountyReferenda[id] ??= [];
        bountyReferenda[id].push(referendum);
      });
    });
    Object.keys(bountyReferenda).forEach((id) => {
      bountyReferenda[Number(id)].sort((a, b) => a.id - b.id);
    });
    return bountyReferenda;
  })
);

const bountyRef$ = state(
  (bountyId: number) =>
    bountyReferenda$.pipe(map((bountyRef) => bountyRef[bountyId])),
  null
);

export const BountyReferendum: FC<{ id: number }> = ({ id }) => {
  const approvingReferenda = useStateObservable(bountyRef$(id));
  return (
    <div className="flex gap-2 p-2 flex-wrap justify-evenly">
      {approvingReferenda == null ? (
        <ApproveBountyButton id={id} />
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
