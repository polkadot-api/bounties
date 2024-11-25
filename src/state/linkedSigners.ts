import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { multixSigner } from "@/lib/multixSigner";
import { toHex } from "@polkadot-api/utils";
import { state, withDefault } from "@react-rxjs/core";
import { getSs58AddressInfo, PolkadotSigner, SS58String } from "polkadot-api";
import {
  combineLatest,
  defaultIfEmpty,
  filter,
  from,
  map,
  merge,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from "rxjs";
import { fromFetch } from "rxjs/fetch";

export type LinkedAccountsResult =
  | {
      type: "root";
    }
  | {
      type: "proxy" | "multisig";
      value: SS58String[];
    };

const cache: Record<SS58String, LinkedAccountsResult> = {};
export const getLinkedAccounts$ = state((address: SS58String) => {
  if (address in cache) return of(cache[address]);
  return merge(
    proxy$(address).pipe(
      filter((v) => v.length > 0),
      map((value): LinkedAccountsResult => ({ type: "proxy", value }))
    ),
    multisig$(address).pipe(
      filter((v) => !!v),
      map((value): LinkedAccountsResult => ({ type: "multisig", value }))
    )
  ).pipe(
    take(1),
    defaultIfEmpty({
      type: "root",
    } satisfies LinkedAccountsResult),
    tap((result) => (cache[address] = result))
  );
});

export type NestedLinkedAccountsResult =
  | {
      type: "root";
    }
  | {
      type: "proxy" | "multisig";
      value: Array<{
        address: SS58String;
        linkedAccounts: NestedLinkedAccountsResult | null;
      }>;
    };
export const getNestedLinkedAccounts$ = (
  address: SS58String
): Observable<NestedLinkedAccountsResult> =>
  getLinkedAccounts$(address).pipe(
    switchMap((result) => {
      if (result.type === "root") return of(result);

      return combineLatest(
        result.value.map((inner) => getNestedLinkedAccounts$(inner))
      ).pipe(
        map((nested) => ({
          type: result.type,
          value: result.value.map((inner, i) => ({
            address: inner,
            linkedAccounts: nested[i],
          })),
        })),
        withDefault({
          type: result.type,
          value: result.value.map((inner) => ({
            address: inner,
            linkedAccounts: null,
          })),
        })
      );
    })
  );

export const getLinkedSigner$ = (address: string) =>
  selectedAccount$.pipe(
    switchMap((account) => {
      if (!account) return of(null);

      const getMatchingSigner$ = (
        address: string
      ): Observable<PolkadotSigner | null> => {
        const info = getSs58AddressInfo(address);
        if (!info.isValid) return of(null);
        if (toHex(info.publicKey) === toHex(account.polkadotSigner.publicKey))
          return of(account.polkadotSigner);

        return getLinkedAccounts$(address).pipe(
          switchMap((result) => {
            if (result.type === "root") return of(null);

            return merge(
              ...result.value.map((inner) =>
                getMatchingSigner$(inner).pipe(filter((v) => !!v))
              )
            ).pipe(
              map((nestedSigner) =>
                result.type === "multisig"
                  ? multixSigner(address, nestedSigner)
                  : nestedSigner
              )
            );
          })
        );
      };
      return getMatchingSigner$(address);
    })
  );

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
