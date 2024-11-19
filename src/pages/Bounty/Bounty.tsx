import { DotValue } from "@/components/DotValue";
import { IdentityLinksPopover } from "@/components/IdentityLinks";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { bounty$ } from "../Home/bounties.state";
import { BlockDue } from "./BlockDue";
import { BountyDetail } from "./BountyDetail";
import { BountyReferendum } from "./BountyReferendum";
import { childBounties$, childBounty$ } from "./childBounties";
import { ChildBounty } from "./ChildBounty";

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
            {bounty.status.value && "curator" in bounty.status.value && (
              <BountyDetail title="Curator">
                <IdentityLinksPopover address={bounty.status.value.curator}>
                  <OnChainIdentity value={bounty.status.value.curator} />
                </IdentityLinksPopover>
              </BountyDetail>
            )}
            {bounty.status.type === "Active" && (
              <BountyDetail title="Update due">
                <BlockDue block={bounty.status.value.update_due} />
              </BountyDetail>
            )}
            {bounty.status.type === "PendingPayout" && (
              <>
                <BountyDetail title="Beneficiary">
                  <OnChainIdentity value={bounty.status.value.beneficiary} />
                </BountyDetail>
                <BountyDetail title="Unlock At">
                  <BlockDue block={bounty.status.value.unlock_at} />
                </BountyDetail>
              </>
            )}
          </div>
          {bounty.status.type === "Proposed" && <BountyReferendum id={id} />}
        </CardContent>
      </Card>
      {bounty.status.type === "Active" ? (
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
      ) : null}
    </div>
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
