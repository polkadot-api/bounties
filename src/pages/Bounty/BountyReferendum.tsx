import { bountyRef$ } from "@/state/bounties";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { ApproveBountyButton } from "../CreateBounty/AproveBounty";

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
