import { selectedAccount$ } from "@/components/AccountSelector";
import { IdentityLinks } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { bounty$ } from "@/state/bounties";
import { TransactionButton } from "@/Transactions";
import type {
  CuratorProposedBounty,
  FundedBounty,
  PendingPayoutBounty,
  ProposedBounty,
} from "@polkadot-api/sdk-governance";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { ApproveBountyButton } from "../CreateBounty/AproveBounty";
import { ActiveBounty } from "./ActiveBounty";
import { BlockDue, isBlockDue$ } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import {
  ApproveBountyReferendum,
  ProposeBountyReferendum,
} from "./BountyReferendum";
import { bountyCuratorSigner$ } from "./curatorSigner";
import { ProposeCurator } from "./ProposeCurator";
import { Loading } from "@/components/Loading";

export const Bounty = () => {
  const id = Number(useParams().id);
  const bounty = useStateObservable(bounty$(id));

  if (!bounty) return <Loading className="p-2">Loading bounty…</Loading>;

  const getContent = () => {
    switch (bounty.type) {
      case "Proposed":
        return <ProposedBounty bounty={bounty} />;
      case "Funded":
        return <FundedBounty bounty={bounty} />;
      case "Active":
        return <ActiveBounty bounty={bounty} />;
      case "CuratorProposed":
        return <CuratorProposedBounty bounty={bounty} />;
      case "PendingPayout":
        return <PendingPayoutBounty bounty={bounty} />;
      case "Approved":
      case "ApprovedWithCurator":
        return (
          <BountyDetails bounty={bounty}>
            <BountyDetailGroup>
              <BountyDetail title="Status">{bounty.type}</BountyDetail>
              <p className="text-muted-foreground">
                The referendum has been approved by the treasury, it will become
                funded after the next spend period
              </p>
            </BountyDetailGroup>
          </BountyDetails>
        );
    }
  };

  return <div className="flex flex-col gap-2 p-2">{getContent()}</div>;
};

const FundedBounty: FC<{
  bounty: FundedBounty;
}> = ({ bounty }) => (
  <BountyDetails bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Funded</BountyDetail>
    </BountyDetailGroup>
    <FundedBountyActions bounty={bounty} />
    <ProposeBountyReferendum id={bounty.id} />
  </BountyDetails>
);

const FundedBountyActions: FC<{ bounty: FundedBounty }> = ({ bounty }) => (
  <ProposeCurator id={bounty.id} />
);

const ProposedBounty: FC<{
  bounty: ProposedBounty;
}> = ({ bounty }) => (
  <BountyDetails bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Proposed</BountyDetail>
    </BountyDetailGroup>
    <ProposedBountyActions bounty={bounty} />
  </BountyDetails>
);

const ProposedBountyActions: FC<{ bounty: ProposedBounty }> = ({ bounty }) => (
  <>
    <ApproveBountyButton id={bounty.id} className="self-start" />
    <ApproveBountyReferendum id={bounty.id} />
  </>
);

const CuratorProposedBounty: FC<{
  bounty: CuratorProposedBounty;
}> = ({ bounty }) => {
  return (
    <BountyDetails bounty={bounty}>
      <BountyDetailGroup>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={bounty.curator} />
        </BountyDetail>
      </BountyDetailGroup>
      <CuratorProposedActions bounty={bounty} />
    </BountyDetails>
  );
};

const CuratorProposedActions: FC<{ bounty: CuratorProposedBounty }> = ({
  bounty,
}) => {
  const signer = useStateObservable(bountyCuratorSigner$(bounty.id));
  return (
    <div className="flex justify-between">
      <TransactionButton signer={signer} createTx={bounty.acceptCuratorRole}>
        Accept Curator Role
      </TransactionButton>
      <TransactionButton
        variant="destructive"
        signer={signer}
        createTx={bounty.unassignCurator}
      >
        Reject Curator Role
      </TransactionButton>
    </div>
  );
};

const PendingPayoutBounty: FC<{
  bounty: PendingPayoutBounty;
}> = ({ bounty }) => {
  const isDue = useStateObservable(isBlockDue$(bounty.unlockAt));
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
    <BountyDetails bounty={bounty}>
      <BountyDetailGroup>
        <BountyDetail title="Status">Pending Payout</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={bounty.curator} />
        </BountyDetail>
        <BountyDetail title="Beneficiary">
          <OnChainIdentity value={bounty.beneficiary} />
        </BountyDetail>
        <BountyDetail title="Unlock At">
          <BlockDue block={bounty.unlockAt} />
        </BountyDetail>
      </BountyDetailGroup>
      <div>
        <TransactionButton
          disabled={!isDue}
          createTx={bounty.claim}
          signer={selectedAccount?.polkadotSigner ?? null}
        >
          Payout Beneficiary
        </TransactionButton>
      </div>
    </BountyDetails>
  );
};
