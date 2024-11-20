import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Binary } from "polkadot-api";
import {
  catchError,
  exhaustMap,
  filter,
  map,
  Observable,
  of,
  startWith,
  withLatestFrom,
} from "rxjs";
import { SubmitTxState } from "./TxProgress";

export const [proposeBounty$, proposeBounty] = createSignal<{
  description: string;
  value: bigint;
}>();

export const getBountyIndex = (state: SubmitTxState) =>
  state.type === "finalized"
    ? typedApi.event.Bounties.BountyProposed.filter(state.events)[0]?.index ??
      null
    : null;

export const proposeBountyState$ = state(
  proposeBounty$.pipe(
    withLatestFrom(selectedAccount$.pipe(filter((v) => !!v))),
    exhaustMap(
      ([bounty, account]): Observable<SubmitTxState> =>
        typedApi.tx.Bounties.propose_bounty({
          description: Binary.fromText(bounty.description),
          value: bounty.value,
        })
          .signSubmitAndWatch(account.polkadotSigner)
          .pipe(
            startWith({
              type: "signing",
            } satisfies SubmitTxState),
            map((v): SubmitTxState => {
              if (v.type === "finalized") {
                if (!v.ok) {
                  console.error(v.dispatchError);
                  return {
                    type: "idle",
                    error: v.dispatchError.type,
                  };
                }
                if (getBountyIndex(v) === null) {
                  return {
                    type: "idle",
                    error: `Transaction succeeded, but bounty index could not be identified. Refresh the list of bounties and continue the flow from there`,
                  };
                }
              }

              return v;
            }),
            catchError((err) =>
              of({
                type: "idle",
                error: err.message,
              } satisfies SubmitTxState)
            )
          )
    )
  ),
  { type: "idle" } satisfies SubmitTxState
);
