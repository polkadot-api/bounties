import { typedApi } from "@/chain";
import { DotValue } from "@/components/DotValue";
import { OnChainIdentity } from "@/components/OnChainIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bounty } from "@polkadot-api/sdk-governance";
import { u32 } from "@polkadot-api/substrate-bindings";
import { state, useStateObservable } from "@react-rxjs/core";
import { AccountId, Binary, SS58String } from "polkadot-api";
import { FC, PropsWithChildren } from "react";
import { map } from "rxjs";
import { BountyDetail, BountyDetailGroup } from "./BountyDetail";

export const BountyDetails: FC<PropsWithChildren<{ bounty: Bounty }>> = ({
  bounty,
  children,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <span className="text-card-foreground/75">{bounty.id}</span>
        <span className="ml-1">{bounty.description}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      <BountyDetailGroup>
        {bounty.type === "Proposed" || bounty.type === "Approved" ? (
          <BountyDetail title="Value">
            <DotValue value={bounty.value} />
          </BountyDetail>
        ) : (
          <>
            <BountyDetail title="Account">
              <OnChainIdentity value={getBountyAccount(bounty.id)} />
            </BountyDetail>
            <BountyDetail title="Balance">
              <BountyBalance id={getBountyAccount(bounty.id)} />
            </BountyDetail>
          </>
        )}
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

const bountyBalance$ = state(
  (id: SS58String) =>
    typedApi.query.System.Account.watchValue(id).pipe(map((v) => v.data.free)),
  null
);

const BountyBalance: FC<{ id: SS58String }> = ({ id }) => {
  const value = useStateObservable(bountyBalance$(id));

  return value ? <DotValue value={value} /> : "…";
};

// Borrowed from next bounties-sdk version
const bountyIdPrefix = Binary.fromText("modlpy/trsry\u0008bt").asBytes();
const getBountyAccount = (id: number) =>
  AccountId().dec(createId(bountyIdPrefix, u32.enc(id)));
const ZERO = new Array(32).fill(0);
const createId = (...parts: Array<Uint8Array>) => {
  const arr = [...ZERO];
  let i = 0;
  parts.forEach((p) => p.forEach((v) => (arr[i++] = v)));

  return new Uint8Array(arr);
};
