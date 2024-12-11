import { typedApi } from "@/chain";
import { IdentityLinks } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Button } from "@/components/ui/button";
import { Bounty as BountyPayload } from "@/sdk/bounties-sdk";
import { bounty$ } from "@/state/bounties";
import { useSingleTransaction } from "@/Transactions";
import { useStateObservable } from "@react-rxjs/core";
import { Loader2 } from "lucide-react";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { ApproveBountyButton } from "../CreateBounty/AproveBounty";
import { ActiveBounty } from "./ActiveBounty";
import { BlockDue } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import {
  ApproveBountyReferendum,
  ProposeBountyReferendum,
} from "./BountyReferendum";
import { bountyCuratorSigner$ } from "./curatorSigner";

export const Bounty = () => {
  const id = Number(useParams().id);
  const bounty = useStateObservable(bounty$(id));

  if (!bounty) return null;

  const getContent = () => {
    switch (bounty.status.type) {
      case "Proposed":
        return <ProposedBounty id={id} bounty={bounty} />;
      case "Funded":
        return <FundedBounty id={id} bounty={bounty} />;
      case "Active":
        return <ActiveBounty id={id} bounty={bounty} status={bounty.status} />;
      case "CuratorProposed":
        return (
          <CuratorProposedBounty
            id={id}
            bounty={bounty}
            status={bounty.status}
          />
        );
      case "PendingPayout":
        return (
          <PendingPayoutBounty id={id} bounty={bounty} status={bounty.status} />
        );
    }

    return (
      <BountyDetails id={id} bounty={bounty}>
        <BountyDetailGroup>
          <BountyDetail title="Status">{bounty.status.type}</BountyDetail>
        </BountyDetailGroup>
      </BountyDetails>
    );
  };

  return <div className="flex flex-col gap-2 p-2">{getContent()}</div>;
};

const FundedBounty: FC<{
  id: number;
  bounty: BountyPayload;
}> = ({ id, bounty }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Funded</BountyDetail>
    </BountyDetailGroup>
    <Button disabled className="self-center">
      Propose Curator
    </Button>
    <ProposeBountyReferendum id={id} />
  </BountyDetails>
);

const ProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
}> = ({ id, bounty }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Proposed</BountyDetail>
    </BountyDetailGroup>
    <ApproveBountyButton id={id} className="self-center" />
    <ApproveBountyReferendum id={id} />
  </BountyDetails>
);

const CuratorProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "CuratorProposed" };
}> = ({ id, bounty, status }) => {
  const signer = useStateObservable(bountyCuratorSigner$(id));
  const [isProposing, trackTx] = useSingleTransaction();

  return (
    <BountyDetails id={id} bounty={bounty}>
      <BountyDetailGroup>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
      </BountyDetailGroup>
      <div>
        <Button
          disabled={!signer || isProposing}
          onClick={() =>
            trackTx(
              typedApi.tx.Bounties.accept_curator({
                bounty_id: id,
              }).signSubmitAndWatch(signer!)
            )
          }
        >
          Accept Curator Role
          {isProposing && <Loader2 className="animate-spin" />}
        </Button>
      </div>
    </BountyDetails>
  );
};

const PendingPayoutBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "PendingPayout" };
}> = ({ id, bounty, status }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Pending Payout</BountyDetail>
      <BountyDetail title="Curator" className="items-start">
        <IdentityLinks address={status.value.curator} />
      </BountyDetail>
      <BountyDetail title="Beneficiary">
        <OnChainIdentity value={status.value.beneficiary} />
      </BountyDetail>
      <BountyDetail title="Unlock At">
        <BlockDue block={status.value.unlock_at} />
      </BountyDetail>
    </BountyDetailGroup>
  </BountyDetails>
);
