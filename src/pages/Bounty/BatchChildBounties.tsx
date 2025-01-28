import { client, typedApi } from "@/chain";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { formatValue } from "@/components/token-formatter";
import { DOT_TOKEN, TokenInput } from "@/components/TokenInput";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePromise } from "@/lib/usePromise";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { Trash2 } from "lucide-react";
import { Binary, SS58String, Transaction } from "polkadot-api";
import { FC, useState } from "react";
import { catchError } from "rxjs";
import { twMerge } from "tailwind-merge";

interface ChildRow {
  name: string;
  amount: bigint | null;
  recipient: SS58String;
}
const emptyRow: ChildRow = {
  name: "",
  amount: null,
  recipient: "",
};

// For an upcoming change not yet released as a wasm which is significant
const unsafeApi = client.getUnsafeApi();
const nextChildId$ = state(
  (id: number) =>
    unsafeApi.query.ChildBounties.ParentTotalChildBounties.watchValue(id).pipe(
      catchError(() =>
        typedApi.query.ChildBounties.ChildBountyCount.watchValue()
      )
    ),
  null
);

interface BatchChildBountiesProps {
  id: number;
  curator: SS58String;
  onSubmit: (tx: Transaction<any, any, any, any>) => void;
}

export const BatchChildBounties: FC<BatchChildBountiesProps> = (props) => {
  return (
    <DialogContent className="max-w-screen-md max-h-full overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Batch Child Bounties</DialogTitle>
        <DialogDescription>
          Create direct payouts for this bounty using child bounties
        </DialogDescription>
      </DialogHeader>
      <BatchChildBountiesForm {...props} />
    </DialogContent>
  );
};

const BatchChildBountiesForm: FC<BatchChildBountiesProps> = ({
  id,
  curator,
  onSubmit,
}) => {
  const [rows, setRows] = useState<ChildRow[]>([]);
  const childId = useStateObservable(nextChildId$(id));
  const minimumValue = usePromise(
    async () => typedApi.constants.ChildBounties.ChildBountyValueMinimum(),
    null
  );

  const isValid =
    childId != null &&
    rows.length &&
    minimumValue != null &&
    rows.every(
      (r) => r.amount != null && r.amount >= minimumValue && r.recipient
    );

  const submit = () => {
    if (!isValid) return null;

    const calls = [
      typedApi.tx.System.remark({
        remark: Binary.fromText(
          "Transaction created with https://bounties.usepapi.app/"
        ),
      }).decodedCall,
      ...rows.flatMap((row, i) => [
        typedApi.tx.ChildBounties.add_child_bounty({
          description: Binary.fromText(row.name),
          parent_bounty_id: id,
          value: row.amount!,
        }).decodedCall,
        typedApi.tx.ChildBounties.propose_curator({
          parent_bounty_id: id,
          child_bounty_id: childId + i,
          curator: MultiAddress.Id(curator),
          fee: 0n,
        }).decodedCall,
        typedApi.tx.ChildBounties.accept_curator({
          parent_bounty_id: id,
          child_bounty_id: childId + i,
        }).decodedCall,
        typedApi.tx.ChildBounties.award_child_bounty({
          parent_bounty_id: id,
          child_bounty_id: childId + i,
          beneficiary: MultiAddress.Id(row.recipient),
        }).decodedCall,
        typedApi.tx.ChildBounties.claim_child_bounty({
          parent_bounty_id: id,
          child_bounty_id: childId + i,
        }).decodedCall,
      ]),
    ];

    const tx = typedApi.tx.Utility.batch_all({
      calls,
    });
    onSubmit(tx);
  };

  const rowUpdater = (index: number, prop: keyof ChildRow) => (value: any) =>
    setRows((rows) => {
      if (index === rows.length) {
        return [
          ...rows,
          {
            ...emptyRow,
            [prop]: value,
          },
        ];
      }
      return rows.map((row, i) =>
        i === index
          ? {
              ...row,
              [prop]: value,
            }
          : row
      );
    });

  return (
    <div className="overflow-auto px-1 space-y-4">
      <table>
        <thead>
          <tr>
            <th></th>
            <th className="w-full">Description</th>
            <th>Amount</th>
            <th>Beneficiary</th>
          </tr>
        </thead>
        <tbody>
          {[...rows, emptyRow].map((row, i) => (
            <tr key={i}>
              <td>
                <button
                  className={twMerge(
                    "text-destructive",
                    i == rows.length ? "invisible" : ""
                  )}
                  tabIndex={-1}
                  onClick={() =>
                    setRows((rows) => rows.filter((_, id) => id !== i))
                  }
                >
                  <Trash2 />
                </button>
              </td>
              <td className="p-1">
                <Input
                  placeholder="Child bounty description"
                  value={row.name}
                  onChange={(evt) => rowUpdater(i, "name")(evt.target.value)}
                />
              </td>
              <td className="p-1">
                <TokenInput
                  className="w-40"
                  placeholder="0.00"
                  token={DOT_TOKEN}
                  value={row.amount}
                  onChange={rowUpdater(i, "amount")}
                />
              </td>
              <td className="p-1">
                <AccountInput
                  value={row.recipient}
                  onChange={rowUpdater(i, "recipient")}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td></td>
            <td></td>
            <td className="text-sm text-muted-foreground text-center">
              (min value:{" "}
              {minimumValue != null
                ? formatValue(minimumValue, DOT_TOKEN.decimals, true)
                : "…"}
              )
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-between items-start gap-2">
        <div className="text-sm text-muted-foreground">
          Note: This transaction will only work for the current child bounty
          count. It might fail if someone creates another child bounty while
          it's getting approved.
        </div>
        <Button disabled={!isValid} onClick={submit}>
          Submit
        </Button>
      </div>
    </div>
  );
};
