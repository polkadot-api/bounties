import { typedApi } from "@/chain";
import { state } from "@react-rxjs/core";
import {
  combineLatest,
  filter,
  from,
  map,
  skip,
  startWith,
  switchMap,
} from "rxjs";

export const childBounties$ = state((parentId: number) => {
  // TODO watchEntries
  return typedApi.query.ChildBounties.ParentChildBounties.watchValue(
    parentId
  ).pipe(
    skip(1),
    startWith(null),
    switchMap(() =>
      typedApi.query.ChildBounties.ChildBounties.getEntries(parentId)
    ),
    map((entries) =>
      Object.fromEntries(
        entries.map(({ keyArgs, value }) => [keyArgs[1], value] as const)
      )
    )
  );
}, null);

export const childBounty$ = state(
  (parentId: number, id: number) =>
    combineLatest([
      childBounties$(parentId).pipe(
        filter((v) => !!v),
        map((v) => v[id]),
        filter((v) => !!v)
      ),
      from(
        typedApi.query.ChildBounties.ChildBountyDescriptions.getValue(id)
      ).pipe(startWith(null)),
    ]).pipe(
      map(([bounty, description]) => ({
        ...bounty,
        description,
      }))
    ),
  null
);
