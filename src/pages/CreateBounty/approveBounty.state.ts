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
import { TxEvent } from "polkadot-api";
import {
  combineLatest,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { bounty$ } from "../Home/bounties.state";

export const [approveBounty$, approveBounty] = createSignal<number>();
export type ApproveBountyState =
  | {
      type: "idle";
      error?: string;
    }
  | {
      type: "signing";
    }
  | TxEvent;
export const isTxInProgress = (state: ApproveBountyState) =>
  state.type !== "idle" && state.type !== "signing";

export const approveBountyDetails$ = state(
  (bountyId: number) =>
    combineLatest([bounty$(bountyId), typedApi.compatibilityToken]).pipe(
      filter(([v]) => !!v),
      take(1),
      map(([bounty, token]) => {
        console.log("yes");
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
          typedApi.tx.Referenda.submit(details).signSubmitAndWatch(
            selectedAccount.polkadotSigner
          )
        )
      )
    )
  )
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
const getOrigin = (value: bigint) => {
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
const getEnactment = (
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
