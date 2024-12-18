import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStateObservable } from "@react-rxjs/core";
import { FC, PropsWithChildren } from "react";
import { useParams } from "react-router-dom";
import { BlockDue } from "../BlockDue";
import { BountyDetail } from "../BountyDetail";
import { childBounty$ } from "./childBounties.state";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { ChildBountyStatus } from "@polkadot-api/descriptors";

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
        {childBounty.status.type === "Active" ? (
          <Active parentId={parent} id={id} status={childBounty.status} />
        ) : childBounty.status.type === "Added" ? (
          <Added parentId={parent} id={id} />
        ) : childBounty.status.type === "CuratorProposed" ? (
          <CuratorProposed
            parentId={parent}
            id={id}
            status={childBounty.status}
          />
        ) : childBounty.status.type === "PendingPayout" ? (
          <PendingPayout
            parentId={parent}
            id={id}
            status={childBounty.status}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

const ChildBountyDetails: FC<PropsWithChildren> = ({ children }) => (
  <div className="flex gap-2 border border-border rounded p-2 flex-col">
    {children}
  </div>
);

const Added: FC<{
  parentId: number;
  id: number;
}> = () => (
  <ChildBountyDetails>
    <BountyDetail title="Status">Added</BountyDetail>
  </ChildBountyDetails>
);

const CuratorProposed: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "CuratorProposed" };
}> = ({ status }) => (
  <ChildBountyDetails>
    <BountyDetail title="Status">Curator Proposed</BountyDetail>
    <BountyDetail title="Curator">
      <OnChainIdentity value={status.value.curator} />
    </BountyDetail>
  </ChildBountyDetails>
);

const Active: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "Active" };
}> = ({ status }) => (
  <ChildBountyDetails>
    <BountyDetail title="Status">Active</BountyDetail>
    <BountyDetail title="Curator">
      <OnChainIdentity value={status.value.curator} />
    </BountyDetail>
  </ChildBountyDetails>
);

const PendingPayout: FC<{
  parentId: number;
  id: number;
  status: ChildBountyStatus & { type: "PendingPayout" };
}> = ({ status }) => (
  <ChildBountyDetails>
    <BountyDetail title="Status">Pending Payout</BountyDetail>
    <BountyDetail title="Curator">
      <OnChainIdentity value={status.value.curator} />
    </BountyDetail>
    <BountyDetail title="Beneficiary">
      <OnChainIdentity value={status.value.beneficiary} />
    </BountyDetail>
    <BountyDetail title="Unlock At">
      <BlockDue block={status.value.unlock_at} />
    </BountyDetail>
  </ChildBountyDetails>
);
