import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { bounties$, bounty$ } from "./bounties.state";
import { useNavigate } from "react-router-dom";
import { DotValue } from "@/components/DotValue";

export const HomePage = () => {
  const bounties = useStateObservable(bounties$);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Bounties</CardTitle>
        <Button>Create bounty</Button>
      </CardHeader>
      <CardContent>
        {bounties ? (
          <Table>
            <TableBody>
              {bounties.map(({ keyArgs: [id] }) => (
                <BountyRow key={id} id={id} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center">Loading…</p>
        )}
      </CardContent>
    </Card>
  );
};
export const homePage$ = bounties$;

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
      <TableCell>{bounty.description?.asText()}</TableCell>
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
