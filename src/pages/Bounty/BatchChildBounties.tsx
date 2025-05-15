import { client, typedApi } from "@/chain";
import { matchedChain } from "@/chainRoute";
import { AccountInput } from "@/components/AccountSelector/AccountInput";
import { ExternalLink } from "@/components/ExternalLink";
import { format } from "@/components/token-formatter";
import { SELECTED_TOKEN, TokenInput } from "@/components/TokenInput";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePromise } from "@/lib/usePromise";
import { getNestedLinkedAccounts$ } from "@/state/linkedSigners";
import { MultiAddress } from "@polkadot-api/descriptors";
import { NestedLinkedAccountsResult } from "@polkadot-api/sdk-accounts";
import { state, useStateObservable } from "@react-rxjs/core";
import { Trash2 } from "lucide-react";
import { Binary, SS58String, Transaction } from "polkadot-api";
import { FC, useEffect, useMemo, useState } from "react";
import { catchError, combineLatest, map, takeLast } from "rxjs";
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

const curatorMultisigUrl$ = state(
  (curator: SS58String) =>
    combineLatest([
      getNestedLinkedAccounts$(curator),
      typedApi.compatibilityToken,
    ]).pipe(
      takeLast(1),
      map(([result, token]) => {
        let txWrapper = (tx: Transaction<any, any, any, any>) => tx;

        let currentResult: NestedLinkedAccountsResult | null = result;
        let addr = curator;
        while (currentResult) {
          switch (currentResult.type) {
            case "root":
              return null;
            case "proxy": {
              const proxyAddr = addr;
              addr = currentResult.value.accounts[0].address;
              currentResult = currentResult.value.accounts[0].linkedAccounts;

              const prevWrapper = txWrapper;
              txWrapper = (tx) =>
                typedApi.tx.Proxy.proxy({
                  real: MultiAddress.Id(proxyAddr),
                  call: prevWrapper(tx).decodedCall,
                  force_proxy_type: undefined,
                });
              break;
            }
            case "multisig": {
              const multisigInfo = {
                addresses: currentResult.value.accounts.map((v) => v.address),
                threshold: currentResult.value.threshold,
              };
              return {
                generateUrl: (tx: Transaction<any, any, any, any> | null) => {
                  const callData = tx
                    ? txWrapper(tx).getEncodedData(token).asHex()
                    : null;

                  const params = new URLSearchParams();
                  params.set("chain", "sm-" + matchedChain);
                  callData != null && params.set("calldata", callData);
                  params.set("signatories", multisigInfo.addresses.join("_"));
                  params.set("threshold", String(multisigInfo.threshold));
                  return `https://multisig.usepapi.app/?${params.toString()}`;
                },
              };
            }
          }
        }

        return null;
      })
    ),
  null
);

interface BatchChildBountiesProps {
  id: number;
  curator: SS58String;
  onSubmit: (tx: Transaction<any, any, any, any>) => void;
}

export const BatchChildBounties: FC<BatchChildBountiesProps> = (props) => {
  const [hasValue, setHasValue] = useState(false);

  return (
    <DialogContent
      className="max-w-3xl max-h-full overflow-hidden flex flex-col"
      onEscapeKeyDown={(evt) => hasValue && evt.preventDefault()}
      onPointerDownOutside={(evt) => hasValue && evt.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle>Batch Child Bounties</DialogTitle>
        <DialogDescription>
          Create direct payouts for this bounty using child bounties
        </DialogDescription>
      </DialogHeader>
      <BatchChildBountiesForm {...props} onValue={setHasValue} />
    </DialogContent>
  );
};

const BatchChildBountiesForm: FC<
  BatchChildBountiesProps & {
    onValue: (value: boolean) => void;
  }
> = ({ id, curator, onSubmit, onValue }) => {
  const [extendExpiry, setExtendExpiry] = useState(true);
  const [rows, setRows] = useState<ChildRow[]>([]);
  const multisigUrl = useStateObservable(curatorMultisigUrl$(curator));
  const childId = useStateObservable(nextChildId$(id));
  const minimumValue = usePromise(
    async () => typedApi.constants.ChildBounties.ChildBountyValueMinimum(),
    null
  );

  const isValid =
    childId != null &&
    rows.length > 0 &&
    minimumValue != null &&
    rows.every(
      (r) => r.amount != null && r.amount >= minimumValue && r.recipient
    );

  const batchTx = useMemo(
    () =>
      isValid ? createBatchTx(id, childId, rows, curator, extendExpiry) : null,
    [isValid, childId, rows, curator, extendExpiry]
  );
  const url = useMemo(
    () => (multisigUrl ? multisigUrl.generateUrl(batchTx) : null),
    [multisigUrl, batchTx]
  );
  const submit = () => {
    if (!batchTx) return null;

    onSubmit(batchTx);
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

  const total = rows
    .map((v) => v.amount)
    .reduce((acc, v) => (acc == null || v == null ? null : acc + v), 0n);

  useEffect(() => onValue(rows.length > 0), [rows]);

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
                  token={SELECTED_TOKEN}
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
        </tbody>
      </table>
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Min amount per row:{" "}
          {minimumValue != null ? format(minimumValue, SELECTED_TOKEN) : "…"}
        </div>
        <div>
          Total payout: {total != null ? format(total, SELECTED_TOKEN) : "…"}
        </div>
      </div>
      <div>
        <Label
          className={twMerge(
            "flex items-center gap-1",
            !extendExpiry && "text-muted-foreground"
          )}
        >
          <Switch checked={extendExpiry} onCheckedChange={setExtendExpiry} />
          Also extend bounty expiration date
        </Label>
      </div>
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
      {url ? (
        <div className="text-muted-foreground space-y-2">
          <p>
            Submitting will create a multisig call, pending to be approved by
            others members of the team. They will have to go to tools like{" "}
            <ExternalLink href="https://multix.cloud/?network=polkadot">
              Multix
            </ExternalLink>{" "}
            to submit their approval.
          </p>
          <p>
            Alternatively, you can use a{" "}
            <ExternalLink href={url}>Multisig call link</ExternalLink>, share it
            with other members of the team, and submit it from there. This
            alternative process doesn't rely on any indexer, for a truly
            decentralized experience.
          </p>
        </div>
      ) : null}
    </div>
  );
};

const createBatchTx = (
  id: number,
  childId: number,
  rows: ChildRow[],
  curator: SS58String,
  extendExpiry: boolean
) => {
  const txs = [
    typedApi.tx.System.remark_with_event({
      remark: Binary.fromText(
        "Transaction created with https://bounties.usepapi.app/"
      ),
    }),
    ...(extendExpiry
      ? [
          typedApi.tx.Bounties.extend_bounty_expiry({
            bounty_id: id,
            remark: Binary.fromText("Bounty is still active"),
          }),
        ]
      : []),
    ...rows.flatMap((row, i) => [
      typedApi.tx.ChildBounties.add_child_bounty({
        description: Binary.fromText(row.name),
        parent_bounty_id: id,
        value: row.amount!,
      }),
      typedApi.tx.ChildBounties.propose_curator({
        parent_bounty_id: id,
        child_bounty_id: childId + i,
        curator: MultiAddress.Id(curator),
        fee: 0n,
      }),
      typedApi.tx.ChildBounties.accept_curator({
        parent_bounty_id: id,
        child_bounty_id: childId + i,
      }),
      typedApi.tx.ChildBounties.award_child_bounty({
        parent_bounty_id: id,
        child_bounty_id: childId + i,
        beneficiary: MultiAddress.Id(row.recipient),
      }),
      typedApi.tx.ChildBounties.claim_child_bounty({
        parent_bounty_id: id,
        child_bounty_id: childId + i,
      }),
    ]),
  ];

  return typedApi.tx.Utility.batch_all({
    calls: txs.map((c) => c.decodedCall),
  });
};
