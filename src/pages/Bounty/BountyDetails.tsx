import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bounty } from "@/sdk/bounties-sdk";
import { FC, PropsWithChildren } from "react";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";

export const BountyDetails: FC<
  PropsWithChildren<{ id: number; bounty: Bounty }>
> = ({ id, bounty, children }) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <span className="text-card-foreground/75">{id}</span>
        <span className="ml-1">{bounty.description?.asText()}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <BountyDetailGroup>
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
      </BountyDetailGroup>
      {children}
    </CardContent>
  </Card>
);
