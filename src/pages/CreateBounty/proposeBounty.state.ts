import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Binary, TxEvent } from "polkadot-api";
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

export const [proposeBounty$, proposeBounty] = createSignal<{
  description: string;
  value: bigint;
}>();

export type ProposeBountyState =
  | {
      type: "idle";
      error?: string;
    }
  | {
      type: "signing";
    }
  | TxEvent;
export const isTxInProgress = (state: ProposeBountyState) =>
  state.type !== "idle" && state.type !== "signing";
export const getBountyIndex = (state: ProposeBountyState) =>
  state.type === "finalized"
    ? typedApi.event.Bounties.BountyProposed.filter(state.events)[0]?.index ??
      null
    : null;

export const proposeBountyState$ = state(
  proposeBounty$.pipe(
    withLatestFrom(selectedAccount$.pipe(filter((v) => !!v))),
    exhaustMap(
      ([bounty, account]): Observable<ProposeBountyState> =>
        typedApi.tx.Bounties.propose_bounty({
          description: Binary.fromText(bounty.description),
          value: bounty.value,
        })
          .signSubmitAndWatch(account.polkadotSigner)
          .pipe(
            startWith({
              type: "signing",
            } satisfies ProposeBountyState),
            map((v): ProposeBountyState => {
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
              } satisfies ProposeBountyState)
            )
          )
    )
  ),
  { type: "idle" } satisfies ProposeBountyState
);
