import { typedApi } from "@/chain";
import { state, withDefault } from "@react-rxjs/core";
import { getSs58AddressInfo, HexString, SS58String } from "polkadot-api";
import {
  combineLatest,
  defaultIfEmpty,
  EMPTY,
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
import { toHex } from "@polkadot-api/utils";

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

export const getLinkedSigners$ = (
  address: string
): Observable<Set<HexString>> => {
  const info = getSs58AddressInfo(address);
  if (!info.isValid) return of(new Set<HexString>());

  return getLinkedAccounts$(address).pipe(
    switchMap((result) => {
      if (result.type === "root") return EMPTY;

      return combineLatest(
        result.value.map((inner) => getLinkedSigners$(inner))
      ).pipe(
        map((nested) => new Set(nested.flatMap((v) => [...v]))),
        map((v) => {
          v.add(toHex(info.publicKey));
          return v;
        })
      );
    }),
    withDefault(new Set([toHex(info.publicKey)]))
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
