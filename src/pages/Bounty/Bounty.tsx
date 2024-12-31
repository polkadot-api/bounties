import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { IdentityLinks } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Bounty as BountyPayload } from "@/sdk/bounties-sdk";
import { bounty$ } from "@/state/bounties";
import { TransactionButton } from "@/Transactions";
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
      case "Approved":
        return (
          <BountyDetails id={id} bounty={bounty}>
            <BountyDetailGroup>
              <BountyDetail title="Status">{bounty.status.type}</BountyDetail>
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
  id: number;
  bounty: BountyPayload;
}> = ({ id, bounty }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Funded</BountyDetail>
    </BountyDetailGroup>
    <FundedBountyActions id={id} />
    <ProposeBountyReferendum id={id} />
  </BountyDetails>
);

/**
 * propose_curator
 *  => spend origin
 * unassign_curator
 *  => reject origin
 *  => proposed curator
 * close_bounty
 *  => reject origin if no active child bounties
 */
const FundedBountyActions: FC<{ id: number }> = ({ id }) => (
  <ProposeCurator id={id} />
);

const ProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
}> = ({ id, bounty }) => (
  <BountyDetails id={id} bounty={bounty}>
    <BountyDetailGroup>
      <BountyDetail title="Status">Proposed</BountyDetail>
    </BountyDetailGroup>
    <ProposedBountyActions id={id} />
  </BountyDetails>
);

/**
 * approve_bounty
 *  => spend origin
 * approve_bounty_with_curator (2412+)
 *  => spend origin
 * close_bounty
 *  => reject origin
 */
const ProposedBountyActions: FC<{ id: number }> = ({ id }) => (
  <>
    <ApproveBountyButton id={id} className="self-start" />
    <ApproveBountyReferendum id={id} />
  </>
);

const CuratorProposedBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "CuratorProposed" };
}> = ({ id, bounty, status }) => {
  return (
    <BountyDetails id={id} bounty={bounty}>
      <BountyDetailGroup>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
      </BountyDetailGroup>
      <CuratorProposedActions id={id} />
    </BountyDetails>
  );
};

/**
 * accept_curator
 *  => proposed curator
 * unassign_curator
 *  => reject origin
 *  => proposed curator
 * close_bounty
 *  => reject origin if no active child bounties
 */
const CuratorProposedActions: FC<{ id: number }> = ({ id }) => {
  const signer = useStateObservable(bountyCuratorSigner$(id));
  return (
    <div className="flex justify-between">
      <TransactionButton
        signer={signer}
        createTx={() =>
          typedApi.tx.Bounties.accept_curator({
            bounty_id: id,
          })
        }
      >
        Accept Curator Role
      </TransactionButton>
      <TransactionButton
        variant="destructive"
        signer={signer}
        createTx={() =>
          typedApi.tx.Bounties.unassign_curator({
            bounty_id: id,
          })
        }
      >
        Reject Curator Role
      </TransactionButton>
    </div>
  );
};

const PendingPayoutBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "PendingPayout" };
}> = ({ id, bounty, status }) => {
  const isDue = useStateObservable(isBlockDue$(status.value.unlock_at));
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
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
      <div>
        <TransactionButton
          disabled={!isDue}
          createTx={() =>
            typedApi.tx.Bounties.claim_bounty({
              bounty_id: id,
            })
          }
          signer={selectedAccount?.polkadotSigner ?? null}
        >
          Payout Beneficiary
        </TransactionButton>
      </div>
    </BountyDetails>
  );
};
