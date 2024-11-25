import { getLinkedAccounts$ } from "@/state/linkedSigners";
import { state, useStateObservable } from "@react-rxjs/core";
import { SS58String } from "polkadot-api";
import { FC, PropsWithChildren, useState } from "react";
import { OnChainIdentity } from "./OnChainIdentity";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export const IdentityLinksPopover: FC<
  PropsWithChildren<{ address: SS58String }>
> = ({ address, children }) => {
  const [navigatedAddress, setNavigatedAddress] = useState<SS58String | null>(
    null
  );

  return (
    <Popover onOpenChange={() => setNavigatedAddress(null)}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent>
        <IdentityLinks
          address={navigatedAddress ?? address}
          setAddress={setNavigatedAddress}
        />
      </PopoverContent>
    </Popover>
  );
};

const IdentityLinks: FC<{
  address: SS58String;
  setAddress: (value: SS58String) => void;
}> = ({ address, setAddress }) => {
  const identityLinks = useStateObservable(identityLinks$(address));

  return (
    <div>
      <OnChainIdentity value={address} />
      {identityLinks ? (
        identityLinks.type !== "root" ? (
          <div className="py-2">
            <p>It's a {identityLinks.type}!</p>
            <ul>
              {identityLinks.value.map((v) => (
                <li
                  key={v}
                  className="cursor-pointer p-2"
                  onClick={() => setAddress(v)}
                >
                  <OnChainIdentity value={v} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Couldn't find proxied accounts or signatories</p>
        )
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
};

const identityLinks$ = state(
  (address: string) => getLinkedAccounts$(address),
  null
);
