import { client } from "@/chain";
import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { state, useStateObservable } from "@react-rxjs/core";
import { FC, PropsWithChildren } from "react";
import { useParams } from "react-router-dom";
import { map } from "rxjs";
import { bounty$ } from "../Home/bounties.state";
import { childBounties$, childBounty$ } from "./childBounties";

export const Bounty = () => {
  const id = Number(useParams().id);
  const bounty = useStateObservable(bounty$(id));
  const childBounties = useStateObservable(childBounties$(id));

  if (!bounty) return null;

  return (
    <div className="flex flex-col gap-2 p-2">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-card-foreground/75">{id}</span>
            <span className="ml-1">{bounty.description?.asText()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex gap-2 border border-border rounded p-2 flex-wrap justify-evenly">
            <BountyDetail title="Value">
              <DotValue value={bounty.value} />
            </BountyDetail>
            <BountyDetail title="Bond">
              <DotValue value={bounty.bond} />
            </BountyDetail>
            <BountyDetail title="Deposit">
              <DotValue value={bounty.curator_deposit} />
            </BountyDetail>
            <BountyDetail title="Fee">
              <DotValue value={bounty.fee} />
            </BountyDetail>
          </div>
          <div className="flex gap-2 border border-border rounded p-2 flex-col">
            <BountyDetail title="Status">{bounty.status.type}</BountyDetail>
            {bounty.status.type === "CuratorProposed" && (
              <BountyDetail title="Curator Proposed">
                {bounty.status.value.curator}
              </BountyDetail>
            )}
            {bounty.status.type === "Active" && (
              <>
                <BountyDetail title="Curator">
                  {bounty.status.value.curator}
                </BountyDetail>
                <BountyDetail title="Update due">
                  <BlockDue block={bounty.status.value.update_due} />
                </BountyDetail>
              </>
            )}
            {bounty.status.type === "PendingPayout" && (
              <>
                <BountyDetail title="Curator">
                  {bounty.status.value.curator}
                </BountyDetail>
                <BountyDetail title="Beneficiary">
                  {bounty.status.value.beneficiary}
                </BountyDetail>
                <BountyDetail title="Unlock At">
                  <BlockDue block={bounty.status.value.unlock_at} />
                </BountyDetail>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Child Bounties</CardTitle>
        </CardHeader>
        <CardContent>
          {childBounties ? (
            Object.keys(childBounties).length ? (
              <ul className="flex flex-col gap-4">
                {Object.keys(childBounties)
                  .reverse()
                  .map((child) => (
                    <ChildBounty key={child} parent={id} id={Number(child)} />
                  ))}
              </ul>
            ) : (
              <p>No child bounties found</p>
            )
          ) : (
            <p>Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const BountyDetail: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <p className="flex gap-1">
    <span className="text-card-foreground/80 font-bold">{title}:</span>
    <span>{children}</span>
  </p>
);

const ChildBounty: FC<{ id: number; parent: number }> = ({ id, parent }) => {
  const child = useStateObservable(childBounty$(parent, id));

  if (!child) return null;

  return (
    <li className="border border-border rounded p-2 flex flex-col gap-2">
      <div className="flex gap-2 text-lg">
        <span>{id}</span>
        <span className="font-bold">{child.description?.asText()}</span>
      </div>
      <div className="flex gap-2 border border-border rounded p-2 flex-wrap justify-evenly">
        <BountyDetail title="Value">
          <DotValue value={child.value} />
        </BountyDetail>
        <BountyDetail title="Deposit">
          <DotValue value={child.curator_deposit} />
        </BountyDetail>
        <BountyDetail title="Fee">
          <DotValue value={child.fee} />
        </BountyDetail>
      </div>
      <div className="flex gap-2 border border-border rounded p-2 flex-col">
        <BountyDetail title="Status">{child.status.type}</BountyDetail>
        {child.status.type === "CuratorProposed" ||
          (child.status.type === "Active" && (
            <BountyDetail title="Curator Proposed">
              {child.status.value.curator}
            </BountyDetail>
          ))}
        {child.status.type === "PendingPayout" && (
          <>
            <BountyDetail title="Curator">
              {child.status.value.curator}
            </BountyDetail>
            <BountyDetail title="Beneficiary">
              {child.status.value.beneficiary}
            </BountyDetail>
            <BountyDetail title="Unlock At">
              <BlockDue block={child.status.value.unlock_at} />
            </BountyDetail>
          </>
        )}
      </div>
    </li>
  );
};

const currentFinalized$ = state(
  client.finalizedBlock$.pipe(map((v) => v.number)),
  null
);
const BLOCK_TIME = 6000;
const MINUTE_MS = 60_000;
const BlockDue: FC<{ block: number }> = ({ block }) => {
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
