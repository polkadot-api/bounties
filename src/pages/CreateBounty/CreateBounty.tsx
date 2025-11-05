import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { selectedAccount$ } from "@/state/account";
import { referendaSdk } from "@/state/referenda";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { approveBountyState$ } from "./approveBounty.state";
import { ReferendumCreatedStep } from "./AproveBounty";
import { getBountyIndex, proposeBountyState$ } from "./proposeBounty.state";
import { ProposeBountyStep } from "./ProposeBountyForm";
import { SubmitReferendumStep } from "./SubmitReferendumForm";

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
  const approveBountyState = useStateObservable(approveBountyState$);

  if (proposeBountyState.type !== "finalized") {
    return <ProposeBountyStep />;
  }
  if (approveBountyState.type !== "finalized") {
    return (
      <SubmitReferendumStep
        title={
          <p className="mb-2">
            Bounty {getBountyIndex(proposeBountyState)} created successfully.
            You should now submit a referendum to get it approved.
          </p>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden px-1">
      <ReferendumCreatedStep
        referendum={referendaSdk.getSubmittedReferendum(approveBountyState)}
      />
    </div>
  );
};
