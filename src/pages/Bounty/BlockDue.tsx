import { client } from "@/chain";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { map } from "rxjs";

const currentFinalized$ = state(
  client.finalizedBlock$.pipe(map((v) => v.number)),
  null
);
const BLOCK_TIME = 6000;
const MINUTE_MS = 60_000;
export const BlockDue: FC<{ block: number }> = ({ block }) => {
  const currentFinalized = useStateObservable(currentFinalized$);
  if (!currentFinalized) return null;

  const blockDiff = block - currentFinalized;
  const timeDiff = blockDiff * BLOCK_TIME;
  const due = new Date(
    // Round to the minute
    Math.round((Date.now() + timeDiff) / MINUTE_MS) * MINUTE_MS
  );

  return (
    <span className="text-foreground">
      <span>#{block.toLocaleString()}</span>
      <span className="ml-1 text-foreground/80">({due.toLocaleString()})</span>
    </span>
  );
};
