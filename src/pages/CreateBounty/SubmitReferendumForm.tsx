import { typedApi } from "@/chain";
import { CopyText } from "@/components/CopyText";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PolkadotRuntimeOriginCaller } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { from } from "rxjs";
import { twMerge } from "tailwind-merge";
import { approveBountyDetails$ } from "./approveBounty.state";

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
          <p className="pl-2 text-foreground/80">
            {getTrackName(details.proposal_origin)}
          </p>
        </div>
        <div>
          <Label>Proposal</Label>
          <p className="pl-2 text-foreground/80">
            Bounties.approveBounty({bountyIndex})
            <span className="text-sm text-foreground/70 ml-1">
              (
              <CopyText text={proposal} binary className="align-middle" />{" "}
              {proposal})
            </span>
          </p>
        </div>
        {/* <div>
          <Label>Enactment</Label>
          <p className="pl-2 text-foreground/80">
            After {details.enactment_moment.value} blocks
          </p>
        </div> */}
        {callData && (
          <div>
            <Label>Call Data</Label>
            <p className="pl-2 text-foreground/80 flex items-center gap-1">
              <CopyText text={callData} binary />
              <div className="overflow-hidden text-ellipsis">{callData}</div>
            </p>
          </div>
        )}
      </div>
      <Button type="submit" forceSvgSize>
        Sign and Submit
        {/* {isLoading && <Loader2 className="animate-spin" />} */}
      </Button>
    </div>
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
