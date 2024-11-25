import { typedApi } from "@/chain";
import { state } from "@react-rxjs/core";
import { partitionByKey, toKeySet } from "@react-rxjs/utils";
import {
  combineLatest,
  from,
  map,
  mergeMap,
  ObservedValueOf,
  skip,
  startWith,
  switchMap,
} from "rxjs";

export const [getBountyById$, bountyKeyChanges$] = partitionByKey(
  // TODO watchEntries
  typedApi.query.Bounties.BountyCount.watchValue().pipe(
    skip(1),
    startWith(null),
    switchMap(() => typedApi.query.Bounties.Bounties.getEntries()),
    mergeMap((v) => v.sort((a, b) => b.keyArgs[0] - a.keyArgs[0]))
  ),
  (res) => res.keyArgs[0],
  (group$, id) =>
    combineLatest([
      group$,
      from(typedApi.query.Bounties.BountyDescriptions.getValue(id)).pipe(
        startWith(null)
      ),
    ]).pipe(
      map(([bounty, description]) => ({
        ...bounty.value,
        description: description ?? null,
      }))
    )
);

export const bountyIds$ = state(
  bountyKeyChanges$.pipe(
    toKeySet(),
    map((set) => [...set])
  ),
  null
);

export const bounty$ = state(getBountyById$, null);

export type BountyPayload = ObservedValueOf<ReturnType<typeof getBountyById$>>;

export const bountiesState$ = bountyKeyChanges$;
