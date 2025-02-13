import { typedApi } from "@/chain";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { IdentityLinks } from "@/components/IdentityLinks";
import { DOT_TOKEN, TokenInput } from "@/components/TokenInput";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TransactionDialog } from "@/Transactions";
import { ActiveBounty as SdkActiveBounty } from "@polkadot-api/sdk-governance";
import { state, useStateObservable } from "@react-rxjs/core";
import { Binary, Transaction } from "polkadot-api";
import { FC, useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { defer, map } from "rxjs";
import { BatchChildBounties } from "./BatchChildBounties";
import { BlockDue, getBlockTimeDiff } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import { ChildBounties } from "./ChildBounty/ChildBounties";
import {
  childBountyKeys$,
  hasActiveChildBounties$,
} from "./ChildBounty/childBounties.state";
import { ChildBounty as SdkChildBounty } from "./ChildBounty/ChildBounty";
import { bountyCuratorSigner$ } from "./curatorSigner";
import { remark } from "./remark";

export const ActiveBounty: FC<{
  bounty: SdkActiveBounty;
}> = ({ bounty }) => {
  const curatorSigner = useStateObservable(bountyCuratorSigner$(bounty.id));

  useEffect(() => {
    const sub = childBountyKeys$(bounty.id).subscribe();
    return () => sub.unsubscribe();
  }, []);

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
                    <span className="text-card-foreground/75">{bounty.id}</span>
                    <span className="ml-1">{bounty.description}</span>
                  </Link>
                </CardTitle>
              </CardHeader>
            </Card>
            <SdkChildBounty />
          </>
        }
      />
      <Route
        path="*"
        element={
          <>
            <BountyDetails bounty={bounty}>
              <BountyDetailGroup>
                <BountyDetail title="Status">Active</BountyDetail>
                <BountyDetail title="Curator" className="items-start">
                  <IdentityLinks address={bounty.curator} />
                </BountyDetail>
                <BountyDetail title="Update due">
                  <BlockDue block={bounty.updateDue} />
                </BountyDetail>
              </BountyDetailGroup>
            </BountyDetails>
            <BountyActions bounty={bounty} />
            <ChildBounties id={bounty.id} />
            <div className="flex justify-between">
              <TransactionDialog
                signer={curatorSigner}
                dialogContent={(onSubmit) => (
                  <AddChildDialog id={bounty.id} onSubmit={onSubmit} />
                )}
              >
                Create Child Bounty
              </TransactionDialog>
              <TransactionDialog
                signer={curatorSigner}
                dialogContent={(onSubmit) => (
                  <BatchChildBounties
                    curator={bounty.curator}
                    id={bounty.id}
                    onSubmit={onSubmit}
                  />
                )}
              >
                Batch Child Bounties
              </TransactionDialog>
            </div>
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
const BountyActions: FC<{ bounty: SdkActiveBounty }> = ({ bounty }) => {
  const curatorSigner = useStateObservable(bountyCuratorSigner$(bounty.id));
  const hasActiveChildBounties = useStateObservable(
    hasActiveChildBounties$(bounty.id)
  );

  const renderExtendExpiry = () => (
    <TransactionDialog
      signer={curatorSigner}
      dialogContent={(onSubmit) => (
        <ExtendExpiryDailog bounty={bounty} onSubmit={onSubmit} />
      )}
    >
      Extend Expiry
    </TransactionDialog>
  );
  const renderAwardBounty = () =>
    !hasActiveChildBounties ? (
      <TransactionDialog
        signer={curatorSigner}
        dialogContent={(onSubmit) => (
          <AwardBountyDialog
            onSubmit={(value) => onSubmit(remark(bounty.award(value)))}
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
  bounty: SdkActiveBounty;
  onSubmit: (tx: Transaction<any, any, any, any>) => void;
}> = ({ bounty, onSubmit }) => {
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
            onSubmit(bounty.extendExpiry(textAreaRef.current!.value))
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
        <DialogDescription>
          Award the complete value of the bounty to a beneficiary
        </DialogDescription>
      </DialogHeader>
      <div className="overflow-hidden px-1 space-y-4">
        <label className="flex flex-col">
          <span className="px-1">Beneficiary</span>
          <AccountInput className="w-full" value={value} onChange={setValue} />
        </label>
        <div className="text-sm text-destructive">
          This will move the bounty to the <b>Pending Payout</b> state, which{" "}
          <b>will award all of the funds</b> of the bounty{" "}
          <b>to the selected beneficiary</b>.
        </div>
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
          <Textarea ref={textAreaRef} />
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
