import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { keyBy } from "@/lib/keyBy";
import {
  DispatchRawOrigin,
  GovernanceOrigin,
  PolkadotRuntimeOriginCaller,
  PreimagesBounded,
  TraitsScheduleDispatchTime,
} from "@polkadot-api/descriptors";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  catchError,
  combineLatest,
  exhaustMap,
  filter,
  map,
  of,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { bounty$ } from "@/state/bounties";
import { SubmitTxState } from "./TxProgress";

export const [approveBounty$, approveBounty] = createSignal<number>();

export const getSubmittedReferendum = (state: SubmitTxState) =>
  state.type === "finalized"
    ? typedApi.event.Referenda.Submitted.filter(state.events)[0] ?? null
    : null;
export type SubmittedReferendum = ReturnType<typeof getSubmittedReferendum>;

export const approveBountyDetails$ = state(
  (bountyId: number) =>
    combineLatest([bounty$(bountyId), typedApi.compatibilityToken]).pipe(
      filter(([v]) => !!v),
      take(1),
      map(([bounty, token]) => {
        const approveBountyTx = typedApi.tx.Bounties.approve_bounty({
          bounty_id: bountyId,
        }).getEncodedData(token);

        const referendaTracks = typedApi.constants.Referenda.Tracks(token);

        return {
          proposal_origin: getOrigin(bounty!.value),
          enactment_moment: TraitsScheduleDispatchTime.After(
            getEnactment(bounty!.value, referendaTracks)
          ),
          proposal: PreimagesBounded.Inline(approveBountyTx),
        };
      })
    ),
  null
);

export const approveBountyState$ = state(
  approveBounty$.pipe(
    exhaustMap((bountyId) =>
      approveBountyDetails$(bountyId).pipe(
        filter((v) => !!v),
        take(1),
        withLatestFrom(selectedAccount$.pipe(filter((v) => !!v))),
        switchMap(([details, selectedAccount]) =>
          typedApi.tx.Referenda.submit(details)
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
                  if (getSubmittedReferendum(v) === null) {
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
      )
    )
  ),
  {
    type: "idle",
  } satisfies SubmitTxState
);

const DOT_UNIT = 10_000_000_000n;
const getSpenderOrigin = (value: bigint) => {
  if (value <= 250n * DOT_UNIT) return GovernanceOrigin.SmallTipper();
  if (value <= 1_000n * DOT_UNIT) return GovernanceOrigin.BigTipper();
  if (value <= 10_000n * DOT_UNIT) return GovernanceOrigin.SmallSpender();
  if (value <= 100_000n * DOT_UNIT) return GovernanceOrigin.MediumSpender();
  if (value <= 1_000_000n * DOT_UNIT) return GovernanceOrigin.BigSpender();
  if (value <= 10_000_000n * DOT_UNIT) return GovernanceOrigin.Treasurer();
  return null;
};
export const getOrigin = (value: bigint) => {
  const origin = getSpenderOrigin(value);
  return origin
    ? PolkadotRuntimeOriginCaller.Origins(origin)
    : PolkadotRuntimeOriginCaller.system(DispatchRawOrigin.Root());
};

const originToTrack: Partial<Record<GovernanceOrigin["type"], string>> = {
  Treasurer: "treasurer",
  SmallTipper: "small_tipper",
  BigTipper: "big_tipper",
  SmallSpender: "small_spender",
  MediumSpender: "medium_spender",
  BigSpender: "big_spender",
};
export const getEnactment = (
  value: bigint,
  referendaTracks: ReturnType<typeof typedApi.constants.Referenda.Tracks>
) => {
  const tracks = keyBy(
    referendaTracks.map(([_, track]) => track),
    (track) => track.name
  );
  const origin = getSpenderOrigin(value);
  const rootEnactment = tracks["root"].min_enactment_period;
  if (!origin) return rootEnactment;

  const track = originToTrack[origin.type] ?? "";
  return tracks[track]?.min_enactment_period ?? rootEnactment;
};
