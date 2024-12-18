import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { childBounties$, childBounty$ } from "./childBounties.state";
import { DotValue } from "@/components/DotValue";
import { useNavigate } from "react-router-dom";

export const ChildBounties: FC<{
  id: number;
}> = ({ id }) => {
  const childBounties = useStateObservable(childBounties$(id));

  return (
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
                    <ChildRow key={child} parent={id} id={Number(child)} />
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
