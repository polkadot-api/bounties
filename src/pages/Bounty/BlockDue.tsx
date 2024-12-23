import { client } from "@/chain";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { map, filter } from "rxjs";

export const currentFinalized$ = state(
  client.finalizedBlock$.pipe(map((v) => v.number)),
  null
);
const BLOCK_TIME = 6000;

export const getBlockTimeDiff = (currentFinalized: number, block: number) => {
  const blockDiff = block - currentFinalized;
  const timeDiff = blockDiff * BLOCK_TIME;
  return timeDiff;
};
export const isBlockDue$ = state(
  (block: number) =>
    currentFinalized$.pipe(
      filter((v) => !!v),
      map((currentFinalized) => getBlockTimeDiff(currentFinalized!, block) <= 0)
    ),
  false
);

const MINUTE_MS = 60_000;
export const BlockDue: FC<{ block: number }> = ({ block }) => {
  const currentFinalized = useStateObservable(currentFinalized$);
  if (!currentFinalized) return null;

  // Round to the minute
  const due = new Date(
    Math.round(
      (Date.now() + getBlockTimeDiff(currentFinalized, block)) / MINUTE_MS
    ) * MINUTE_MS
  );

  return (
    <span className="text-foreground">
      <span>#{block.toLocaleString()}</span>
      <span className="ml-1 text-foreground/80">({due.toLocaleString()})</span>
    </span>
  );
};
