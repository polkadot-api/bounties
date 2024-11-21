import { DotValue } from "@/components/DotValue";
import { IdentityLinksPopover } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { BountyPayload } from "../Home/bounties.state";
import { BlockDue } from "./BlockDue";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";
import { BountyDetails } from "./BountyDetails";
import { childBounties$, childBounty$ } from "./childBounties";
import { ChildBounty } from "./ChildBounty";

export const ActiveBounty: FC<{
  id: number;
  bounty: BountyPayload;
  status: BountyPayload["status"] & { type: "Active" };
}> = ({ id, bounty, status }) => {
  const childBounties = useStateObservable(childBounties$(id));

  return (
    <>
      <BountyDetails id={id} bounty={bounty}>
        <BountyDetailGroup>
          <BountyDetail title="Status">Active</BountyDetail>
          <BountyDetail title="Curator">
            <IdentityLinksPopover address={status.value.curator}>
              <OnChainIdentity value={status.value.curator} />
            </IdentityLinksPopover>
          </BountyDetail>
          <BountyDetail title="Update due">
            <BlockDue block={status.value.update_due} />
          </BountyDetail>
        </BountyDetailGroup>
      </BountyDetails>
      <Routes>
        <Route path=":childId/*" element={<ChildBounty />} />
        <Route
          path="*"
          element={
            <Card>
              <CardHeader>
                <CardTitle>Child Bounties</CardTitle>
              </CardHeader>
              <CardContent>
                {childBounties ? (
                  Object.keys(childBounties).length ? (
                    <Table className="flex flex-col gap-4">
                      <TableBody>
                        {Object.keys(childBounties)
                          .reverse()
                          .map((child) => (
                            <ChildRow
                              key={child}
                              parent={id}
                              id={Number(child)}
                            />
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>No child bounties found</p>
                  )
                ) : (
                  <p>Loading…</p>
                )}
              </CardContent>
            </Card>
          }
        />
      </Routes>
    </>
  );
};

const ChildRow: FC<{ id: number; parent: number }> = ({ id, parent }) => {
  const child = useStateObservable(childBounty$(parent, id));
  const navigate = useNavigate();

  if (!child) return null;

  return (
    <TableRow className="cursor-pointer" onClick={() => navigate(`${id}`)}>
      <TableCell className="font-medium text-right">{id}</TableCell>
      <TableCell className="w-full">{child.description?.asText()}</TableCell>
      <TableCell>{child.status.type}</TableCell>
      <TableCell className="text-right">
        <DotValue
          value={child.value}
          className="tabular-nums"
          fixedDecimals={2}
        />
      </TableCell>
    </TableRow>
  );
};
