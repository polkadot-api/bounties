import { TransactionButton, TransactionDialog } from "@/Transactions";
import { typedApi } from "@/chain";
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
import { ChildBountyStatus, MultiAddress } from "@polkadot-api/descriptors";
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
          <span className="ml-1">{childBounty.description?.asText()}</span>
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
        {childBounty.status.type === "Active" ? (
          <Active parentId={parent} id={id} status={childBounty.status} />
        ) : childBounty.status.type === "Added" ? (
          <Added parentId={parent} id={id} />
        ) : childBounty.status.type === "CuratorProposed" ? (
          <CuratorProposed
            parentId={parent}
            id={id}
            status={childBounty.status}
          />
        ) : childBounty.status.type === "PendingPayout" ? (
          <PendingPayout
            parentId={parent}
            id={id}
            status={childBounty.status}
          />
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
  parentId: number;
  id: number;
}> = ({ parentId, id }) => {
  const parentSigner = useStateObservable(bountyCuratorSigner$(parentId));

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
                  typedApi.tx.ChildBounties.propose_curator({
                    parent_bounty_id: parentId,
                    child_bounty_id: id,
                    curator: MultiAddress.Id(curator),
                    fee,
                  })
                )
              }
            />
          )}
        >
          Propose Curator
        </TransactionDialog>
        <CloseBountyButton
          parentId={parentId}
          id={id}
          parentSigner={parentSigner}
        />
      </div>
    </>
  );
};

const CuratorProposed: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "CuratorProposed" };
}> = ({ status, parentId, id }) => {
  const parentSigner = useStateObservable(bountyCuratorSigner$(parentId));
  const childSigner = useStateObservable(
    childBountyCuratorSigner$(parentId, id)
  );

  const unassignTx = () =>
    typedApi.tx.ChildBounties.unassign_curator({
      parent_bounty_id: parentId,
      child_bounty_id: id,
    });

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Curator Proposed</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
      </ChildBountyDetails>

      <div className="flex justify-between">
        <TransactionButton
          createTx={() =>
            typedApi.tx.ChildBounties.accept_curator({
              parent_bounty_id: parentId,
              child_bounty_id: id,
            })
          }
          signer={childSigner}
        >
          Accept Curator Role
        </TransactionButton>
        <div className="space-x-2">
          {childSigner ? (
            <TransactionButton
              createTx={unassignTx}
              signer={childSigner}
              variant="secondary"
            >
              Give up curator role
            </TransactionButton>
          ) : parentSigner ? (
            <TransactionButton
              createTx={unassignTx}
              signer={childSigner}
              variant="destructive"
            >
              Unassign and slash curator
            </TransactionButton>
          ) : null}
          {parentSigner && (
            <CloseBountyButton
              parentId={parentId}
              id={id}
              parentSigner={parentSigner}
            />
          )}
        </div>
      </div>
    </>
  );
};

const Active: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "Active" };
}> = ({ status, parentId, id }) => {
  const parentSigner = useStateObservable(bountyCuratorSigner$(parentId));
  const childSigner = useStateObservable(
    childBountyCuratorSigner$(parentId, id)
  );

  const unassignTx = () =>
    typedApi.tx.ChildBounties.unassign_curator({
      parent_bounty_id: parentId,
      child_bounty_id: id,
    });

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Active</BountyDetail>
        <BountyDetail title="Curator">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
      </ChildBountyDetails>
      <div className="flex justify-between">
        <TransactionDialog
          signer={childSigner ?? parentSigner}
          dialogContent={(onSubmit) => (
            <AwardBountyDialog
              onSubmit={(value) =>
                onSubmit(
                  typedApi.tx.ChildBounties.award_child_bounty({
                    parent_bounty_id: parentId,
                    child_bounty_id: id,
                    beneficiary: MultiAddress.Id(value!),
                  })
                )
              }
            />
          )}
        >
          Award Bounty
        </TransactionDialog>
        <div className="space-x-2">
          {childSigner ? (
            <TransactionButton
              createTx={unassignTx}
              signer={childSigner}
              variant="secondary"
            >
              Give up curator role
            </TransactionButton>
          ) : parentSigner ? (
            <TransactionButton
              createTx={unassignTx}
              signer={childSigner}
              variant="destructive"
            >
              Unassign and slash curator
            </TransactionButton>
          ) : null}
          <CloseBountyButton
            parentId={parentId}
            id={id}
            parentSigner={parentSigner}
          />
        </div>
      </div>
    </>
  );
};

const CloseBountyButton: FC<{
  id: number;
  parentId: number;
  parentSigner: PolkadotSigner | null;
}> = ({ id, parentId, parentSigner }) => (
  <TransactionButton
    createTx={() =>
      typedApi.tx.ChildBounties.close_child_bounty({
        parent_bounty_id: parentId,
        child_bounty_id: id,
      })
    }
    signer={parentSigner}
    variant="destructive"
  >
    Close Bounty
  </TransactionButton>
);

const PendingPayout: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "PendingPayout" };
}> = ({ status, parentId, id }) => {
  const parentSigner = useStateObservable(bountyCuratorSigner$(parentId));
  const isDue = useStateObservable(isBlockDue$(status.value.unlock_at));
  const selectedAccount = useStateObservable(selectedAccount$);

  return (
    <>
      <ChildBountyDetails>
        <BountyDetail title="Status">Pending Payout</BountyDetail>
        <BountyDetail title="Curator" className="items-start">
          <IdentityLinks address={status.value.curator} />
        </BountyDetail>
        <BountyDetail title="Beneficiary" className="items-start">
          <IdentityLinks address={status.value.beneficiary} />
        </BountyDetail>
        <BountyDetail title="Unlock At">
          <BlockDue block={status.value.unlock_at} />
        </BountyDetail>
      </ChildBountyDetails>
      <div className="flex justify-between">
        <TransactionButton
          disabled={!isDue}
          createTx={() =>
            typedApi.tx.ChildBounties.claim_child_bounty({
              parent_bounty_id: parentId,
              child_bounty_id: id,
            })
          }
          signer={selectedAccount?.polkadotSigner ?? null}
        >
          Payout Beneficiary
        </TransactionButton>
        {parentSigner ? (
          <TransactionButton
            createTx={() =>
              typedApi.tx.ChildBounties.unassign_curator({
                parent_bounty_id: parentId,
                child_bounty_id: id,
              })
            }
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
        <label className="flex flex-col">
          <span className="px-1">Curator</span>
          <AccountInput
            className="w-full"
            value={curator}
            onChange={setCurator}
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
