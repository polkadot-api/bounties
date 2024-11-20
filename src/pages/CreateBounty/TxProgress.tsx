import { FadeText } from "@/components/FadeText";
import { Spinner } from "@/components/Icons";
import { TxEvent } from "polkadot-api";
import { FC } from "react";
import { twMerge } from "tailwind-merge";

export type SubmitTxState =
  | {
      type: "idle";
      error?: string;
    }
  | {
      type: "signing";
    }
  | TxEvent;
export const isTxInProgress = (state: SubmitTxState) =>
  state.type !== "idle" && state.type !== "signing";

const descriptions: Record<TxEvent["type"], string> = {
  signed: "Broadcasting the transaction…",
  broadcasted: "Waiting for the transaction to be included in a block…",
  txBestBlocksState:
    "Transaction is included in a block, but it's not confirmed yet. Hang tight…",
  finalized: "Transaction finalized!",
};
export const TxProgress: FC<{ state: SubmitTxState }> = ({ state }) => (
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
