import { selectedAccount$ } from "@/components/AccountSelector";
import { FadeText } from "@/components/FadeText";
import { Spinner } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { TxEvent } from "polkadot-api";
import { FC } from "react";
import { twMerge } from "tailwind-merge";
import {
  getBountyIndex,
  isTxInProgress,
  ProposeBountyState,
  proposeBountyState$,
} from "./proposeBounty.state";
import { ProposeBountyForm } from "./ProposeBountyForm";
import { SubmitReferendumForm } from "./SubmitReferendumForm";

export const CreateBountyButton = () => {
  const account = useStateObservable(selectedAccount$);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!account}>Create bounty</Button>
      </DialogTrigger>
      <CreateBountyDialog />
    </Dialog>
  );
};

const CreateBountyDialog = () => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create bounty</DialogTitle>
      <DialogDescription>
        You will need to perform two steps: creating the bounty and setting up
        the referendum
      </DialogDescription>
    </DialogHeader>
    <Subscribe fallback="Loading…">
      <CreateBountyDialogContent />
    </Subscribe>
  </DialogContent>
);

const CreateBountyDialogContent = () => {
  const proposeBountyState = useStateObservable(proposeBountyState$);
  const bountyIndex = getBountyIndex(proposeBountyState);

  return (
    <div className="overflow-hidden px-1 relative">
      {bountyIndex === null ? (
        <ProposeBountyForm
          className={twMerge(
            "transition-opacity",
            isTxInProgress(proposeBountyState) && "opacity-0"
          )}
        />
      ) : (
        <SubmitReferendumForm bountyIndex={bountyIndex} />
      )}
      {bountyIndex === null && <TxProgress state={proposeBountyState} />}
    </div>
  );
};

const descriptions: Record<TxEvent["type"], string> = {
  signed: "Broadcasting the transaction…",
  broadcasted: "Waiting for the transaction to be included in a block…",
  txBestBlocksState:
    "Transaction is included in a block, but it's not confirmed yet. Hang tight…",
  finalized: "Transaction finalized!",
};
const TxProgress: FC<{ state: ProposeBountyState }> = ({ state }) => (
  <div
    className={twMerge(
      "absolute w-full left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 opacity-0 flex flex-col items-center gap-2",
      isTxInProgress(state) && "opacity-100"
    )}
  >
    <Spinner />
    {state.type in descriptions ? (
      <FadeText className="text-sm text-foreground/80 text-center">
        {descriptions[state.type as TxEvent["type"]] ?? "Positioning"}
      </FadeText>
    ) : null}
  </div>
);
