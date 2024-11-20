import { typedApi } from "@/chain";
import { CopyText } from "@/components/CopyText";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PolkadotRuntimeOriginCaller } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC, ReactNode } from "react";
import { from } from "rxjs";
import { twMerge } from "tailwind-merge";
import {
  approveBounty,
  approveBountyDetails$,
  approveBountyState$,
} from "./approveBounty.state";
import { getBountyIndex, proposeBountyState$ } from "./proposeBounty.state";
import { isTxInProgress, TxProgress } from "./TxProgress";
import { Loader2 } from "lucide-react";

const compatibilityToken$ = state(from(typedApi.compatibilityToken));
export const SubmitReferendumForm: FC<{
  bountyIndex: number;
  className?: string;
}> = ({ className, bountyIndex }) => {
  const details = useStateObservable(approveBountyDetails$(bountyIndex));
  const token = useStateObservable(compatibilityToken$);

  if (!details) {
    return <div>Loading…</div>;
  }

  const proposal = details.proposal.value?.asHex();
  const callData = (() => {
    try {
      return typedApi.tx.Referenda.submit(details)
        .getEncodedData(token)
        .asHex();
    } catch (_) {
      console.error(_);
      return null;
    }
  })();

  return (
    <div className={twMerge(className, "space-y-2")}>
      <div className="text-sm text-foreground/80">
        <p>
          To submit the referendum on-chain, no input is needed. All the values
          for the transaction are derived from the bounty.
        </p>
        <p>
          You will be able to post a description of the referendum in
          polkassembly or subsquare once it's on-chain
        </p>
      </div>
      <div className="space-y-2">
        <div>
          <Label>Track</Label>
          <div className="pl-2 text-foreground/80">
            {getTrackName(details.proposal_origin)}
          </div>
        </div>
        <div>
          <Label>Proposal</Label>
          <div className="pl-2 text-foreground/80">
            Bounties.approveBounty({bountyIndex})
            <span className="text-sm text-foreground/70 ml-1">
              (
              <CopyText text={proposal} binary className="align-middle" />{" "}
              {proposal})
            </span>
          </div>
        </div>
        {callData && (
          <div>
            <Label>Call Data</Label>
            <div className="pl-2 text-foreground/80 flex items-center gap-1">
              <CopyText text={callData} binary />
              <div className="overflow-hidden text-ellipsis">{callData}</div>
            </div>
          </div>
        )}
      </div>
      <SubmitButton onClick={() => approveBounty(bountyIndex)} />
    </div>
  );
};

const SubmitButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  const approveBountyState = useStateObservable(approveBountyState$);
  const isLoading = approveBountyState.type !== "idle";

  return (
    <Button type="submit" disabled={isLoading} forceSvgSize onClick={onClick}>
      Sign and Submit
      {isLoading && <Loader2 className="animate-spin" />}
    </Button>
  );
};

const getTrackName = (origin: PolkadotRuntimeOriginCaller) => {
  if (origin.type !== "Origins") return "Root";
  const spenderOrigin = origin.value;
  switch (spenderOrigin.type) {
    case "SmallTipper":
      return "Small Tipper";
    case "BigTipper":
      return "Big Tipper";
    case "SmallSpender":
      return "Small Spender";
    case "MediumSpender":
      return "Medium Spender";
    case "BigSpender":
      return "Big Spender";
  }
  return spenderOrigin.type;
};

export const SubmitReferendumStep: FC<{
  bountyId?: number;
  title?: ReactNode;
}> = ({ title, bountyId }) => {
  const approveBountyState = useStateObservable(approveBountyState$);
  const proposeBountyState = useStateObservable(proposeBountyState$);

  const bountyIndex = bountyId ?? getBountyIndex(proposeBountyState);

  if (bountyIndex === null) return null;

  return (
    <div className="overflow-hidden px-1 relative">
      <div
        className={twMerge(
          "transition-opacity",
          isTxInProgress(approveBountyState) && "opacity-0"
        )}
      >
        {title}
        <SubmitReferendumForm bountyIndex={bountyIndex} />
      </div>
      <TxProgress state={approveBountyState} />
    </div>
  );
};
