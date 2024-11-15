import { client, typedApi } from "@/chain";
import { state } from "@react-rxjs/core";
import { combineLatest, exhaustMap, filter, from, map, startWith } from "rxjs";

export const bounties$ = state(
  // TODO watchEntries
  client.finalizedBlock$.pipe(
    exhaustMap(() => typedApi.query.Bounties.Bounties.getEntries()),
    map((v) => v.sort((a, b) => b.keyArgs[0] - a.keyArgs[0]))
  ),
  null
);

const bountiesById$ = bounties$.pipeState(
  filter((bounties) => !!bounties),
  map((bounties) =>
    Object.fromEntries(bounties.map(({ keyArgs: [id], value }) => [id, value]))
  )
);

export const bounty$ = state(
  (id: number) =>
    combineLatest([
      bountiesById$.pipe(
        map((v) => v[id]),
        filter((v) => !!v)
      ),
      from(typedApi.query.Bounties.BountyDescriptions.getValue(id)).pipe(
        startWith(null)
      ),
    ]).pipe(
      map(([bounty, description]) => ({
        ...bounty,
        description,
      }))
    ),
  null
);
