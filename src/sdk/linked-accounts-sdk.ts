import { SS58String } from "polkadot-api";
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
import { LinkedAccountsSdkTypedApi } from "./linked-accounts-descriptors";
import { state, withDefault } from "@react-rxjs/core";

export type LinkedAccountsResult =
  | {
      type: "root";
    }
  | {
      type: "proxy";
      value: {
        addresses: SS58String[];
      };
    }
  | {
      type: "multisig";
      value: {
        threshold: number;
        addresses: SS58String[];
      };
    };

export type NestedLinkedAccountsResult =
  | {
      type: "root";
    }
  | {
      type: "proxy";
      value: {
        accounts: Array<{
          address: SS58String;
          linkedAccounts: NestedLinkedAccountsResult | null;
        }>;
      };
    }
  | {
      type: "multisig";
      value: {
        threshold: number;
        accounts: Array<{
          address: SS58String;
          linkedAccounts: NestedLinkedAccountsResult | null;
        }>;
      };
    };

export function getLinkedAccountsSdk(typedApi: LinkedAccountsSdkTypedApi) {
  const proxy$ = (address: string) =>
    from(typedApi.query.Proxy.Proxies.getValue(address)).pipe(
      map((r) => r[0].map((v) => v.delegate))
    );

  const cache: Record<SS58String, LinkedAccountsResult> = {};
  const getLinkedAccounts$ = state((address: SS58String) => {
    if (address in cache) return of(cache[address]);
    return merge(
      proxy$(address).pipe(
        filter((v) => v.length > 0),
        map(
          (value): LinkedAccountsResult => ({
            type: "proxy",
            value: { addresses: value },
          })
        )
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

  const getNestedLinkedAccounts$ = (
    address: SS58String
  ): Observable<NestedLinkedAccountsResult> =>
    getLinkedAccounts$(address).pipe(
      switchMap((result) => {
        if (result.type === "root") return of(result);

        const accounts$ = combineLatest(
          result.value.addresses.map((inner) => getNestedLinkedAccounts$(inner))
        ).pipe(
          map((nested) =>
            result.value.addresses.map((inner, i) => ({
              address: inner,
              linkedAccounts: nested[i],
            }))
          ),
          withDefault(
            result.value.addresses.map((inner) => ({
              address: inner,
              linkedAccounts: null,
            }))
          )
        );

        if (result.type === "proxy") {
          return accounts$.pipe(
            map(
              (accounts): NestedLinkedAccountsResult => ({
                type: "proxy",
                value: { accounts },
              })
            )
          );
        }
        return accounts$.pipe(
          map(
            (accounts): NestedLinkedAccountsResult => ({
              type: "multisig",
              value: {
                threshold: result.value.threshold,
                accounts,
              },
            })
          )
        );
      })
    );

  return {
    getLinkedAccounts$,
    getNestedLinkedAccounts$,
  };
}

// IBP archive nodes
const multisig$ = (address: string) =>
  fromFetch("https://chainsafe.squids.live/multix-arrow/v/v5/graphql", {
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
            threshold
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
    switchMap(
      (v) =>
        v.json() as Promise<{
          data: {
            accountMultisigs: Array<{
              multisig: {
                signatories: Array<{ signatory: { address: SS58String } }>;
                address: SS58String;
                threshold: number;
              };
            }>;
          };
        }>
    ),
    map((v): { addresses: SS58String[]; threshold: number } | null => {
      const multisig = v.data.accountMultisigs[0]?.multisig;
      if (!multisig) return null;
      return {
        threshold: multisig.threshold,
        addresses: multisig.signatories.map((v: any) => v.signatory.address),
      };
    })
  );
