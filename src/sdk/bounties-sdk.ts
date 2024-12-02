import { partitionByKey, toKeySet } from "@react-rxjs/utils";
import { Binary } from "polkadot-api";
import {
  combineLatest,
  from,
  map,
  mergeMap,
  skip,
  startWith,
  switchMap,
} from "rxjs";
import {
  BountiesSdkTypedApi,
  BountyWithoutDescription,
} from "./bounties-descriptors";

export interface Bounty extends BountyWithoutDescription {
  description: Binary | null;
}

export function getBountiesSdk(typedApi: BountiesSdkTypedApi) {
  const [getBountyById$, bountyKeyChanges$] = partitionByKey(
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
        map(
          ([bounty, description]): Bounty => ({
            ...bounty.value,
            description: description ?? null,
          })
        )
      )
  );

  const bountyIds$ = bountyKeyChanges$.pipe(
    toKeySet(),
    map((set) => [...set])
  );

  return {
    bountyIds$,
    getBountyById$,
  };
}
