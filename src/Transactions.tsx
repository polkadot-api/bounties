import { shareLatest } from "@react-rxjs/core";
import { Loader2 } from "lucide-react";
import {
  InvalidTxError,
  PolkadotSigner,
  Transaction,
  TxEvent,
} from "polkadot-api";
import { FC, ReactElement, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { lastValueFrom, Observable } from "rxjs";
import { Button, ButtonProps } from "./components/ui/button";
import { Dialog, DialogTrigger } from "./components/ui/dialog";
import { typedApi } from "./chain";

// Error invalid fee keeps the toast open
export function trackTransaction(tx$: Observable<TxEvent>) {
  const shared$ = tx$.pipe(shareLatest());

  let id = toast.loading("Signing transaction…", {
    autoClose: false,
  });
  shared$.subscribe({
    next: (res) => {
      if (res.type === "signed") {
        toast.update(id, {
          render: "Sending transaction…",
        });
      } else if (res.type === "txBestBlocksState" && res.found) {
        toast.update(
          id,
          res.ok
            ? {
                render: "Waiting for confirmation…",
              }
            : {
                render:
                  "Transaction included in a block but is failing: " +
                  JSON.stringify(res.dispatchError),
              }
        );
      } else if (res.type === "finalized") {
        // Can't toast.update the type of toast :(
        toast.dismiss(id);

        if (!res.ok) {
          id = toast.error(
            "Transaction failed: " + JSON.stringify(res.dispatchError),
            {
              autoClose: false,
            }
          );
          return;
        }

        const newMultisigEvt = typedApi.event.Multisig.NewMultisig.filter(
          res.events
        );
        const approveMultisigEvt =
          typedApi.event.Multisig.MultisigApproval.filter(res.events);
        if (newMultisigEvt.length || approveMultisigEvt.length) {
          id = toast.success("Multisig signature submitted");
          return;
        }

        const multisigExecuted =
          typedApi.event.Multisig.MultisigExecuted.filter(res.events)[0];
        if (multisigExecuted && !multisigExecuted.result.success) {
          id = toast.error(
            "Multisig call failed: " +
              JSON.stringify(multisigExecuted.result.value),
            { autoClose: false }
          );
          return;
        }

        id = toast.success("Transaction succeeded!");
      }
    },
    error: (error) => {
      toast.dismiss(id);
      if (error instanceof InvalidTxError) {
        toast.error("Transaction failed: " + JSON.stringify(error.error), {
          autoClose: false,
        });
      } else {
        toast.error("Transaction failed: " + error.message, {
          autoClose: false,
        });
      }
    },
  });

  return shared$;
}

export const useSingleTransaction = () => {
  const [isPending, setIsPending] = useState(false);

  const startTx = async (tx$: Observable<TxEvent>) => {
    setIsPending(true);
    try {
      await lastValueFrom(trackTransaction(tx$));
    } catch (ex) {
      console.error(ex);
    }
    setIsPending(false);
  };

  return [isPending, startTx] as const;
};

export const Transactions = () => <ToastContainer position="bottom-right" />;

export const TransactionButton: FC<
  ButtonProps & {
    createTx: () => Transaction<any, any, any, any>;
    signer: PolkadotSigner | null;
  }
> = ({ createTx, signer, children, ...props }) => {
  const [isOngoing, trackTx] = useSingleTransaction();

  return (
    <Button
      {...props}
      disabled={!signer || isOngoing || props.disabled}
      onClick={() => trackTx(createTx().signSubmitAndWatch(signer!))}
    >
      {children}
      {isOngoing && <Loader2 className="animate-spin" />}
    </Button>
  );
};

export const TransactionDialog: FC<
  ButtonProps & {
    signer: PolkadotSigner | null;
    dialogContent: (
      onSubmit: (tx: Transaction<any, any, any, any>) => void
    ) => ReactElement;
  }
> = ({ signer, dialogContent, children, ...props }) => {
  const [open, setOpen] = useState(false);
  const [isOngoing, trackTx] = useSingleTransaction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...props} disabled={!signer || isOngoing || props.disabled}>
          {children}
          {isOngoing && <Loader2 className="animate-spin" />}
        </Button>
      </DialogTrigger>
      {dialogContent((tx) => {
        trackTx(tx.signSubmitAndWatch(signer!));
        setOpen(false);
      })}
    </Dialog>
  );
};
