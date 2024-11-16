import { typedApi } from "@/chain";
import { state, useStateObservable } from "@react-rxjs/core";
import { SS58String } from "polkadot-api";
import { FC, PropsWithChildren, useState } from "react";
import {
  defaultIfEmpty,
  filter,
  from,
  map,
  merge,
  of,
  switchMap,
  take,
  tap,
} from "rxjs";
import { fromFetch } from "rxjs/fetch";
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
        identityLinks.result ? (
          <div className="py-2">
            <p>It's a {identityLinks.result.type}!</p>
            <ul>
              {identityLinks.result.value.map((v) => (
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

const proxy$ = (address: string) =>
  from(typedApi.query.Proxy.Proxies.getValue(address)).pipe(
    map((r) => r[0].map((v) => v.delegate))
  );
const multisig$ = (address: string) =>
  fromFetch("https://chainsafe.squids.live/multix-arrow/v/v4/graphql", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
  query Multisig($address: String) {
    accountMultisigs(where: {multisig: {address_eq: $address}}, limit: 1) {
      multisig {
        signatories {
          signatory {
            address
          }
        }
        address
      }
    }
  }
          `,
      variables: {
        address,
      },
      operationName: "Multisig",
    }),
  }).pipe(
    switchMap((v) => v.json()),
    map(
      (v): SS58String[] | null =>
        v.data.accountMultisigs[0]?.multisig.signatories.map(
          (v: any) => v.signatory.address
        ) ?? null
    )
  );
interface IdentityLinkResult {
  type: "proxy" | "multisig";
  value: SS58String[];
}
const cache: Record<SS58String, IdentityLinkResult | null> = {};

const identityLinks$ = state((address: string) => {
  if (address in cache) return of({ result: cache[address] });

  return merge(
    proxy$(address).pipe(
      tap((v) => console.log("proxy", v)),
      filter((v) => v.length > 0),
      map((value): IdentityLinkResult => ({ type: "proxy", value }))
    ),
    multisig$(address).pipe(
      tap((v) => console.log("multisig", v)),
      filter((v) => !!v),
      map((value): IdentityLinkResult => ({ type: "multisig", value }))
    )
  ).pipe(
    take(1),
    defaultIfEmpty(null),
    tap((result) => (cache[address] = result)),
    map((v) => ({ result: v }))
  );
}, null);
