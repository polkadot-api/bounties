import { selectedAccount$ } from "@/components/AccountSelector";
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
import { FC } from "react";
import { SubmitReferendumStep } from "./SubmitReferendumForm";
import {
  approveBountyState$,
  getSubmittedReferendum,
  SubmittedReferendum,
} from "./approveBounty.state";

export const ApproveBountyButton: FC<{ id: number; className?: string }> = ({
  id,
  className,
}) => {
  const account = useStateObservable(selectedAccount$);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!account} className={className}>
          Approve Bounty
        </Button>
      </DialogTrigger>
      <ApproveBountyDialog id={id} />
    </Dialog>
  );
};

const ApproveBountyDialog: FC<{ id: number }> = ({ id }) => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Approve bounty</DialogTitle>
      <DialogDescription>
        Create a referendum to approve the bounty
      </DialogDescription>
    </DialogHeader>
    <Subscribe fallback="Loading…">
      <ApproveBountyDialogContent id={id} />
    </Subscribe>
  </DialogContent>
);

const ApproveBountyDialogContent: FC<{ id: number }> = ({ id }) => {
  const approveBountyState = useStateObservable(approveBountyState$);

  if (approveBountyState.type !== "finalized") {
    return <SubmitReferendumStep bountyId={id} />;
  }

  return (
    <div className="overflow-hidden px-1">
      <ReferendumCreatedStep
        referendum={getSubmittedReferendum(approveBountyState)}
      />
    </div>
  );
};

export const ReferendumCreatedStep: FC<{ referendum: SubmittedReferendum }> = ({
  referendum,
}) => {
  if (!referendum) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold">
        Referendum {referendum.index} created successfully!
      </h3>
      <p className="text-foreground/80">
        You can now fill in the description and details of the referendum either
        in{" "}
        <a
          className="underline"
          target="_blank"
          href={`https://polkadot.polkassembly.io/referenda/${referendum.index}`}
        >
          Polkassembly
        </a>{" "}
        or{" "}
        <a
          className="underline"
          target="_blank"
          href={`https://polkadot.subsquare.io/referenda/${referendum.index}`}
        >
          Subsquare
        </a>
        .
      </p>
      <p className="text-foreground/80">
        Remember that the referendum will need a decision deposit in order to
        start voting!
      </p>
    </div>
  );
};
