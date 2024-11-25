import { DotValue } from "@/components/DotValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { bounty$, bountyIds$ } from "@/state/bounties";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { CreateBountyButton } from "../CreateBounty";

export const HomePage = () => {
  const bounties = useStateObservable(bountyIds$);

  return (
    <div className="p-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Bounties</CardTitle>
          <CreateBountyButton />
        </CardHeader>
        <CardContent>
          {bounties ? (
            <Table>
              <TableBody>
                {bounties.map((id) => (
                  <BountyRow key={id} id={id} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const BountyRow: FC<{ id: number }> = ({ id }) => {
  const bounty = useStateObservable(bounty$(id));
  const navigate = useNavigate();
  if (!bounty) return null;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => navigate(`/bounty/${id}`)}
    >
      <TableCell className="font-medium text-right">{id}</TableCell>
      <TableCell className="w-full">{bounty.description?.asText()}</TableCell>
      <TableCell>{bounty.status.type}</TableCell>
      <TableCell className="text-right">
        <DotValue
          value={bounty.value}
          className="tabular-nums"
          fixedDecimals={2}
        />
      </TableCell>
    </TableRow>
  );
};
