import { shareLatest } from "@react-rxjs/core";
import { InvalidTxError, TxEvent } from "polkadot-api";
import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { lastValueFrom, Observable } from "rxjs";

export function trackTransaction(tx$: Observable<TxEvent>) {
  const shared$ = tx$.pipe(shareLatest());

  let id = toast.loading("Sending transaction…", {
    autoClose: false,
  });
  shared$.subscribe({
    next: (res) => {
      if (res.type === "txBestBlocksState" && res.found) {
        toast.update(
          id,
          res.ok
            ? {
                render: "Waiting for confirmation…",
              }
            : {
                type: "warning",
                render:
                  "Transaction included in a block but is failing: " +
                  JSON.stringify(res.dispatchError),
              }
        );
      } else if (res.type === "finalized") {
        // Can't toast.update the type of toast :(
        toast.dismiss(id);
        id = toast[res.ok ? "success" : "error"](
          res.ok
            ? "Transaction succeeded!"
            : "Transaction failed: " + JSON.stringify(res.dispatchError),
          res.ok
            ? {}
            : {
                autoClose: false,
              }
        );
      }
    },
    error: (error) => {
      if (error instanceof InvalidTxError) {
        toast.dismiss(id);
        toast.error("Transaction failed: " + JSON.stringify(error.error), {
          autoClose: false,
        });
      } else {
        console.error(error);
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
