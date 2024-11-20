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
import { SubmitReferendumForm } from "./SubmitReferendumForm";

export const ApproveBountyButton: FC<{ id: number }> = ({ id }) => {
  const account = useStateObservable(selectedAccount$);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!account}>Approve Bounty</Button>
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
      <CreateBountyDialogContent id={id} />
    </Subscribe>
  </DialogContent>
);

const CreateBountyDialogContent: FC<{ id: number }> = ({ id }) => {
  return (
    <div className="overflow-hidden px-1 relative">
      <SubmitReferendumForm bountyIndex={id} />
    </div>
  );
};
