import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { useParams } from "react-router-dom";
import { BlockDue } from "./BlockDue";
import { BountyDetail } from "./BountyDetail";
import { childBounty$ } from "./childBounties";
import { OnChainIdentity } from "@/components/OnChainIdentity";

export const ChildBounty: FC = () => {
  const parent = Number(useParams().id);
  const id = Number(useParams().childId);

  const childBounty = useStateObservable(childBounty$(parent, id));

  if (!childBounty) return null;

  return (
    <Card className="border border-border rounded p-2 flex flex-col gap-2">
      <CardHeader>
        <CardTitle>
          <span className="text-card-foreground/75">Child {id}</span>
          <span className="ml-1">{childBounty.description?.asText()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex gap-2 border border-border rounded p-2 flex-wrap justify-evenly">
          <BountyDetail title="Value">
            <DotValue value={childBounty.value} />
          </BountyDetail>
          <BountyDetail title="Deposit">
            <DotValue value={childBounty.curator_deposit} />
          </BountyDetail>
          <BountyDetail title="Fee">
            <DotValue value={childBounty.fee} />
          </BountyDetail>
        </div>
        <div className="flex gap-2 border border-border rounded p-2 flex-col">
          <BountyDetail title="Status">{childBounty.status.type}</BountyDetail>
          {childBounty.status.type === "CuratorProposed" ||
            (childBounty.status.type === "Active" && (
              <BountyDetail title="Curator Proposed">
                <OnChainIdentity value={childBounty.status.value.curator} />
              </BountyDetail>
            ))}
          {childBounty.status.type === "PendingPayout" && (
            <>
              <BountyDetail title="Curator">
                <OnChainIdentity value={childBounty.status.value.curator} />
              </BountyDetail>
              <BountyDetail title="Beneficiary">
                <OnChainIdentity value={childBounty.status.value.beneficiary} />
              </BountyDetail>
              <BountyDetail title="Unlock At">
                <BlockDue block={childBounty.status.value.unlock_at} />
              </BountyDetail>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
