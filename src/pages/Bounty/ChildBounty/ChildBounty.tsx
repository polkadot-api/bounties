import { TransactionButton, TransactionDialog } from "@/Transactions";
import { selectedAccount$ } from "@/components/AccountSelector";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { DotValue } from "@/components/DotValue";
import { IdentityLinks } from "@/components/IdentityLinks";
import { DOT_TOKEN, TokenInput } from "@/components/TokenInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiAddress } from "@polkadot-api/descriptors";
import {
  ActiveChildBounty,
  AddedChildBounty,
  CuratorProposedChildBounty,
  PendingPayoutChildBounty,
  ChildBounty as SdkChildBounty,
} from "@polkadot-api/sdk-governance";
import { useStateObservable } from "@react-rxjs/core";
import { PolkadotSigner } from "polkadot-api";
import { FC, PropsWithChildren, useState } from "react";
import { useParams } from "react-router-dom";
import { AwardBountyDialog } from "../ActiveBounty";
import { BlockDue, isBlockDue$ } from "../BlockDue";
import { BountyDetail } from "../BountyDetail";
import { bountyCuratorSigner$ } from "../curatorSigner";
import { childBounty$, childBountyCuratorSigner$ } from "./childBounties.state";

export const ChildBounty: FC = () => {
  const parent = Number(useParams().id);
  const id = Number(useParams().childId);

  const childBounty = useStateObservable(childBounty$(parent, id));
  if (!childBounty) return null;

  return (
    <Card className="border border-border rounded p-2 flex flex-col gap-2">
      <CardHeader>
        <CardTitle>
          <span className="text-card-foreground/75">Child {id}</span>
          <span className="ml-1">{childBounty.description}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex gap-2 border border-border rounded p-2 flex-wrap justify-evenly">
          <BountyDetail title="Value">
            <DotValue value={childBounty.value} />
          </BountyDetail>
          <BountyDetail title="Deposit">
            <DotValue value={childBounty.curator_deposit} />
          </BountyDetail>
          <BountyDetail title="Fee">
            <DotValue value={childBounty.fee} />
          </BountyDetail>
        </div>
        {childBounty.type === "Active" ? (
          <Active bounty={childBounty} />
        ) : childBounty.type === "Added" ? (
          <Added bounty={childBounty} />
        ) : childBounty.type === "CuratorProposed" ? (
          <CuratorProposed bounty={childBounty} />
        ) : childBounty.type === "PendingPayout" ? (
          <PendingPayout bounty={childBounty} />
        ) : null}
      </CardContent>
    </Card>
  );
};

const ChildBountyDetails: FC<PropsWithChildren> = ({ children }) => (
  <div className="flex gap-2 border border-border rounded p-2 flex-col">
    {children}
  </div>
);

const Added: FC<{
  bounty: AddedChildBounty;
}> = ({ bounty }) => {
  const parentSigner = useStateObservable(
    // TODO standarize camelCase
    bountyCuratorSigner$(bounty.parent_bounty)
  );

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Added</BountyDetail>
      </ChildBountyDetails>
      <div className="flex justify-between">
        <TransactionDialog
          signer={parentSigner}
          dialogContent={(onSubmit) => (
            <ProposeCuratorDialog
              onSubmit={(curator, fee) =>
                onSubmit(
                  // TODO standarize MultiAddress between bounties and childBounties
                  bounty.proposeCurator(MultiAddress.Id(curator), fee)
                )
              }
            />
          )}
        >
          Propose Curator
        </TransactionDialog>
        <CloseBountyButton bounty={bounty} parentSigner={parentSigner} />
      </div>
    </>
  );
};

const CuratorProposed: FC<{
  bounty: CuratorProposedChildBounty;
}> = ({ bounty }) => {
  const parentSigner = useStateObservable(
    bountyCuratorSigner$(bounty.parent_bounty)
  );
  const childSigner = useStateObservable(
    childBountyCuratorSigner$(bounty.parent_bounty, bounty.id)
  );

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={bounty.curator} />
        </BountyDetail>
      </ChildBountyDetails>

      <div className="flex justify-between">
        <TransactionButton
          createTx={bounty.acceptCuratorRole}
          signer={childSigner}
        >
          Accept Curator Role
        </TransactionButton>
        <div className="space-x-2">
          {childSigner ? (
            <TransactionButton
              createTx={bounty.unassignCurator}
              signer={childSigner}
              variant="secondary"
            >
              Give up curator role
            </TransactionButton>
          ) : parentSigner ? (
            <TransactionButton
              createTx={bounty.unassignCurator}
              signer={childSigner}
              variant="destructive"
            >
              Unassign and slash curator
            </TransactionButton>
          ) : null}
          {parentSigner && (
            <CloseBountyButton bounty={bounty} parentSigner={parentSigner} />
          )}
        </div>
      </div>
    </>
  );
};

const Active: FC<{
  bounty: ActiveChildBounty;
}> = ({ bounty }) => {
  const parentSigner = useStateObservable(
    bountyCuratorSigner$(bounty.parent_bounty)
  );
  const childSigner = useStateObservable(
    childBountyCuratorSigner$(bounty.parent_bounty, bounty.id)
  );

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Active</BountyDetail>
        <BountyDetail title="Curator">
          <IdentityLinks address={bounty.curator} />
        </BountyDetail>
      </ChildBountyDetails>
      <div className="flex justify-between">
        <TransactionDialog
          signer={childSigner ?? parentSigner}
          dialogContent={(onSubmit) => (
            <AwardBountyDialog
              onSubmit={(value) => onSubmit(bounty.award(value))}
            />
          )}
        >
          Award Bounty
        </TransactionDialog>
        <div className="space-x-2">
          {childSigner ? (
            <TransactionButton
              createTx={bounty.unassignCurator}
              signer={childSigner}
              variant="secondary"
            >
              Give up curator role
            </TransactionButton>
          ) : parentSigner ? (
            <TransactionButton
              createTx={bounty.unassignCurator}
              signer={childSigner}
              variant="destructive"
            >
              Unassign and slash curator
            </TransactionButton>
          ) : null}
          <CloseBountyButton bounty={bounty} parentSigner={parentSigner} />
        </div>
      </div>
    </>
  );
};

const CloseBountyButton: FC<{
  bounty: SdkChildBounty;
  parentSigner: PolkadotSigner | null;
}> = ({ bounty, parentSigner }) =>
  "close" in bounty ? (
    <TransactionButton
      createTx={bounty.close}
      signer={parentSigner}
      variant="destructive"
    >
      Close Bounty
    </TransactionButton>
  ) : null;

const PendingPayout: FC<{
  bounty: PendingPayoutChildBounty;
}> = ({ bounty }) => {
  const parentSigner = useStateObservable(
    bountyCuratorSigner$(bounty.parent_bounty)
  );
  const isDue = useStateObservable(isBlockDue$(bounty.unlockAt));
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Pending Payout</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={bounty.curator} />
        </BountyDetail>
        <BountyDetail title="Beneficiary" className="items-start">
          <IdentityLinks address={bounty.beneficiary} />
        </BountyDetail>
        <BountyDetail title="Unlock At">
          <BlockDue block={bounty.unlockAt} />
        </BountyDetail>
      </ChildBountyDetails>
      <div className="flex justify-between">
        <TransactionButton
          disabled={!isDue}
          createTx={bounty.claim}
          signer={selectedAccount?.polkadotSigner ?? null}
        >
          Payout Beneficiary
        </TransactionButton>
        {parentSigner ? (
          <TransactionButton
            createTx={bounty.unassignCurator}
            signer={parentSigner}
            variant="destructive"
          >
            Reject and slash curator
          </TransactionButton>
        ) : null}
      </div>
    </>
  );
};

const ProposeCuratorDialog: FC<{
  onSubmit: (curator: string, fee: bigint) => void;
}> = ({ onSubmit }) => {
  const [curator, setCurator] = useState<string | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Propose Curator</DialogTitle>
        <DialogDescription>
          Propose a curator for the bounty. The curator must accept the role
          before it becomes active.
        </DialogDescription>
      </DialogHeader>
      <div className="overflow-hidden px-1 space-y-4">
        <label className="flex flex-col">
          <span className="px-1">Curator</span>
          <AccountInput
            className="w-full"
            value={curator}
            onChange={setCurator}
          />
        </label>
        <label className="flex flex-col">
          <span className="px-1">Fee</span>
          <TokenInput
            className="w-full"
            token={DOT_TOKEN}
            value={fee}
            onChange={setFee}
          />
        </label>
        <Button
          disabled={!curator || fee == null}
          onClick={() => onSubmit(curator!, fee!)}
        >
          Submit
        </Button>
      </div>
    </DialogContent>
  );
};
