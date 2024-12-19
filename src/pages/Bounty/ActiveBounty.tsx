import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { IdentityLinks } from "@/components/IdentityLinks";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bounty } from "@/sdk/bounties-sdk";
import { TransactionButton, TransactionDialog } from "@/Transactions";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { Binary, Transaction } from "polkadot-api";
import { FC, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { defer, map } from "rxjs";
import { BlockDue, getBlockTimeDiff, isBlockDue$ } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import { ChildBounties } from "./ChildBounty/ChildBounties";
import { hasActiveChildBounties$ } from "./ChildBounty/childBounties.state";
import { ChildBounty } from "./ChildBounty/ChildBounty";
import { bountyCuratorSigner$ } from "./curatorSigner";
import { DOT_TOKEN, TokenInput } from "@/components/TokenInput";

export const ActiveBounty: FC<{
  id: number;
  bounty: Bounty;
  status: Bounty["status"] & { type: "Active" };
}> = ({ id, bounty, status }) => {
  const curatorSigner = useStateObservable(bountyCuratorSigner$(id));

  return (
    <Routes>
      <Route
        path=":childId/*"
        element={
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  <Link to="..">
                    <span className="text-card-foreground/75">{id}</span>
                    <span className="ml-1">{bounty.description?.asText()}</span>
                  </Link>
                </CardTitle>
              </CardHeader>
            </Card>
            <ChildBounty />
          </>
        }
      />
      <Route
        path="*"
        element={
          <>
            <BountyDetails id={id} bounty={bounty}>
              <BountyDetailGroup>
                <BountyDetail title="Status">Active</BountyDetail>
                <BountyDetail title="Curator" className="items-start">
                  <IdentityLinks address={status.value.curator} />
                </BountyDetail>
                <BountyDetail title="Update due">
                  <BlockDue block={status.value.update_due} />
                </BountyDetail>
              </BountyDetailGroup>
            </BountyDetails>
            <BountyActions id={id} updateDue={status.value.update_due} />
            <ChildBounties id={id} />
            {curatorSigner ? (
              <div>
                <TransactionDialog
                  signer={curatorSigner}
                  dialogContent={(onSubmit) => (
                    <AddChildDialog id={id} onSubmit={onSubmit} />
                  )}
                >
                  Create Child Bounty
                </TransactionDialog>
              </div>
            ) : null}
          </>
        }
      />
    </Routes>
  );
};

/**
 * unassign_curator
 *  => reject origin.
 *  => curator voluntarily giving up the bounty.
 *  => anyone if the due time has passed.
 * extend_bounty_expiry
 *  => curator
 * award_bounty
 *  => curator if there are no child bounties active
 * close_bounty
 *  => reject origin if no active child bounties
 */
const BountyActions: FC<{ id: number; updateDue: number }> = ({
  id,
  updateDue,
}) => {
  const selectedAccount = useStateObservable(selectedAccount$);
  const curatorSigner = useStateObservable(bountyCuratorSigner$(id));
  const isDue = useStateObservable(isBlockDue$(updateDue));
  const hasActiveChildBounties = useStateObservable(
    hasActiveChildBounties$(id)
  );

  if (!(curatorSigner || isDue)) {
    return null;
  }

  const renderUnassignCurator = () => {
    const unassignTx = () =>
      typedApi.tx.Bounties.unassign_curator({
        bounty_id: id,
      });
    if (curatorSigner) {
      return (
        <TransactionButton
          createTx={unassignTx}
          signer={curatorSigner}
          variant="secondary"
        >
          Give up curator role
        </TransactionButton>
      );
    }
    if (isDue) {
      return (
        <TransactionButton
          signer={selectedAccount?.polkadotSigner ?? null}
          createTx={unassignTx}
          variant="destructive"
        >
          Unassign and slash curator
        </TransactionButton>
      );
    }
    return null;
  };
  const renderExtendExpiry = () =>
    curatorSigner ? (
      <TransactionDialog
        signer={curatorSigner}
        dialogContent={(onSubmit) => (
          <ExtendExpiryDailog id={id} onSubmit={onSubmit} />
        )}
      >
        Extend Expiry
      </TransactionDialog>
    ) : null;
  const renderAwardBounty = () =>
    curatorSigner && !hasActiveChildBounties ? (
      <TransactionDialog
        signer={curatorSigner}
        dialogContent={(onSubmit) => (
          <AwardBountyDialog
            onSubmit={(value) =>
              onSubmit(
                typedApi.tx.Bounties.award_bounty({
                  bounty_id: id,
                  beneficiary: MultiAddress.Id(value!),
                })
              )
            }
          />
        )}
      >
        Award Bounty
      </TransactionDialog>
    ) : null;

  return (
    <div className="flex gap-2 border border-border rounded p-2">
      <div className="flex-1 space-x-2">
        {renderExtendExpiry()}
        {renderAwardBounty()}
      </div>
      <div>{renderUnassignCurator()}</div>
    </div>
  );
};

const nextUpdate$ = state(
  defer(typedApi.constants.Bounties.BountyUpdatePeriod).pipe(
    map((blocks) => new Date(Date.now() + getBlockTimeDiff(0, blocks)))
  ),
  null
);
const ExtendExpiryDailog: FC<{
  id: number;
  onSubmit: (tx: Transaction<any, any, any, any>) => void;
}> = ({ id, onSubmit }) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const nextUpdate = useStateObservable(nextUpdate$);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Extend Expiry</DialogTitle>
        <DialogDescription>Extend the due date of the bounty</DialogDescription>
      </DialogHeader>
      <div className="overflow-hidden px-1 space-y-4">
        <div>
          Bounty will be extended to:{" "}
          {nextUpdate ? (
            nextUpdate.toLocaleString()
          ) : (
            <span className="opacity-50">Calculating…</span>
          )}
        </div>
        <label className="flex flex-col">
          <span className="px-1">Remark</span>
          <Textarea ref={textAreaRef} placeholder="(Optional)" />
        </label>
        <Button
          onClick={() =>
            onSubmit(
              typedApi.tx.Bounties.extend_bounty_expiry({
                bounty_id: id,
                remark: Binary.fromText(textAreaRef.current!.value),
              })
            )
          }
        >
          Submit
        </Button>
      </div>
    </DialogContent>
  );
};

export const AwardBountyDialog: FC<{
  onSubmit: (value: string) => void;
}> = ({ onSubmit }) => {
  const [value, setValue] = useState<string | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Award Bounty</DialogTitle>
        <DialogDescription>Award the bounty to a beneficiary</DialogDescription>
      </DialogHeader>
      <div className="overflow-hidden px-1 space-y-4">
        <label className="flex flex-col">
          <span className="px-1">Beneficiary</span>
          <AccountInput className="w-full" value={value} onChange={setValue} />
        </label>
        <Button disabled={!value} onClick={() => onSubmit(value!)}>
          Submit
        </Button>
      </div>
    </DialogContent>
  );
};

const AddChildDialog: FC<{
  id: number;
  onSubmit: (tx: Transaction<any, any, any, any>) => void;
}> = ({ id, onSubmit }) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState<bigint | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Child Bounty</DialogTitle>
        <DialogDescription>Create a child bounty</DialogDescription>
      </DialogHeader>
      <div className="overflow-hidden px-1 space-y-4">
        <label className="flex flex-col">
          <span className="px-1">Description</span>
          <Textarea ref={textAreaRef} placeholder="(Optional)" />
        </label>
        <label className="flex flex-col">
          <span className="px-1">Value</span>
          <TokenInput
            className="w-full"
            token={DOT_TOKEN}
            value={value}
            onChange={setValue}
          />
        </label>
        <Button
          disabled={value == null}
          onClick={() =>
            onSubmit(
              typedApi.tx.ChildBounties.add_child_bounty({
                parent_bounty_id: id,
                description: Binary.fromText(textAreaRef.current!.value),
                value: value!,
              })
            )
          }
        >
          Submit
        </Button>
      </div>
    </DialogContent>
  );
};
