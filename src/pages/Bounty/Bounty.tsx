import { IdentityLinks } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Button } from "@/components/ui/button";
import { Bounty as BountyPayload } from "@/sdk/bounties-sdk";
import { bounty$ } from "@/state/bounties";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { ActiveBounty } from "./ActiveBounty";
import { BlockDue } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import { BountyReferendum } from "./BountyReferendum";
import { bountyCuratorSigner$ } from "./curatorSigner";

export const Bounty = () => {
  const id = Number(useParams().id);
  const bounty = useStateObservable(bounty$(id));

  if (!bounty) return null;

  const getContent = () => {
    switch (bounty.status.type) {
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
      case "Proposed":
        return <ProposedBounty id={id} bounty={bounty} />;
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

const ProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
}> = ({ id, bounty }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Proposed</BountyDetail>
    </BountyDetailGroup>
    <BountyReferendum id={id} />
  </BountyDetails>
);

const CuratorProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "CuratorProposed" };
}> = ({ id, bounty, status }) => {
  const signer = useStateObservable(bountyCuratorSigner$(id));

  return (
    <BountyDetails id={id} bounty={bounty}>
      <BountyDetailGroup>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
      </BountyDetailGroup>
      <div>
        <Button disabled={!signer}>Accept Curator Role</Button>
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
