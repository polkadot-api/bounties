import {
  getNestedLinkedAccounts$,
  NestedLinkedAccountsResult,
} from "@/state/linkedSigners";
import { state, useStateObservable } from "@react-rxjs/core";
import { SS58String } from "polkadot-api";
import { FC } from "react";
import { OnChainIdentity } from "./OnChainIdentity";

const nestedLinks$ = state(
  (address: SS58String) => getNestedLinkedAccounts$(address),
  null
);

export const IdentityLinks: FC<{ address: SS58String }> = ({ address }) => {
  const nestedLinks = useStateObservable(nestedLinks$(address));

  return (
    <div>
      <OnChainIdentity value={address} />
      <NestedLinksDisplay links={nestedLinks} />
    </div>
  );
};

const NestedLinksDisplay: FC<{
  links: NestedLinkedAccountsResult | null;
}> = ({ links }) =>
  !links || links.type === "root" ? null : (
    <div>
      <div>{links.type === "multisig" ? "Multisig" : "Proxy"}</div>
      <ul className="pl-4 space-y-1">
        {links.value.map((v, i) => (
          <li key={i}>
            <OnChainIdentity value={v.address} />
            <NestedLinksDisplay links={v.linkedAccounts} />
          </li>
        ))}
      </ul>
    </div>
  );
