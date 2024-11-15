import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { BlockDue } from "./BlockDue";
import { BountyDetail } from "./BountyDetail";
import { childBounty$ } from "./childBounties";

export const ChildBounty: FC = () => {
  const parent = Number(useParams().id);
  const id = Number(useParams().childId);

  const child = useStateObservable(childBounty$(parent, id));

  if (!child) return null;

  return (
    <Card className="border border-border rounded p-2 flex flex-col gap-2">
      <CardHeader>
        <CardTitle>
          <span className="text-card-foreground/75">Child {id}</span>
          <span className="ml-1">{child.description?.asText()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
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
      </CardContent>
    </Card>
  );
};
