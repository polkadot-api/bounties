import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { bounty$ } from "@/state/bounties";
import { referendaSdk } from "@/state/referenda";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  catchError,
  defer,
  exhaustMap,
  filter,
  map,
  of,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { SubmitTxState } from "./TxProgress";

export const [approveBounty$, approveBounty] = createSignal<number>();

export type SubmittedReferendum = ReturnType<
  typeof referendaSdk.getSubmittedReferendum
>;

export const getApproveBountyTx = (bountyId: number) =>
  typedApi.tx.Bounties.approve_bounty({
    bounty_id: bountyId,
  });

export const approveBountyState$ = state(
  approveBounty$.pipe(
    switchMap((bountyId) =>
      bounty$(bountyId).pipe(
        filter((v) => !!v),
        take(1)
      )
    ),
    withLatestFrom(
      selectedAccount$.pipe(filter((v) => !!v)),
      typedApi.compatibilityToken
    ),
    exhaustMap(([bounty, selectedAccount, token]) =>
      defer(() =>
        referendaSdk
          .createSpenderReferenda(
            getApproveBountyTx(bounty.id).getEncodedData(token),
            bounty.value
          )
          .signSubmitAndWatch(selectedAccount.polkadotSigner)
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
                if (referendaSdk.getSubmittedReferendum(v) === null) {
                  return {
                    type: "idle",
                    error: `Transaction succeeded, but bounty index could not be identified. Refresh the list of bounties and continue the flow from there`,
                  };
                }
              }

              return v;
            })
          )
      ).pipe(
        catchError((err) =>
          of({
            type: "idle",
            error: err.message,
          } satisfies SubmitTxState)
        )
      )
    )
  ),
  {
    type: "idle",
  } satisfies SubmitTxState
);
