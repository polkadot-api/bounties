import { typedApi } from "@/chain";
import { matchedChain } from "@/chainRoute";
import { selectedAccount$ } from "@/components/AccountSelector";
import { getMultisigSigner, getProxySigner } from "@polkadot-api/meta-signers";
import {
  createLinkedAccountsSdk,
  MultisigProvider,
  novasamaProvider,
} from "@polkadot-api/sdk-accounts";
import { toHex } from "@polkadot-api/utils";
import { getSs58AddressInfo, PolkadotSigner } from "polkadot-api";
import {
  catchError,
  defaultIfEmpty,
  EMPTY,
  filter,
  map,
  merge,
  Observable,
  of,
  startWith,
  switchMap,
  take,
} from "rxjs";

const linkedAccountsSdk = createLinkedAccountsSdk(
  typedApi as any,
  fallbackMultisigProviders([
    novasamaProvider(matchedChain),
    subscanProvider(matchedChain),
  ])
);

export const getNestedLinkedAccounts$ =
  linkedAccountsSdk.getNestedLinkedAccounts$;

export const getLinkedSigner$ = (topAddress: string) =>
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

        return linkedAccountsSdk.getLinkedAccounts$(address).pipe(
          switchMap((result) => {
            if (result.type === "root") return of(null);

            return merge(
              ...result.value.addresses.map((inner) =>
                getMatchingSigner$(inner).pipe(filter((v) => !!v))
              )
            ).pipe(
              take(1),
              map((nestedSigner) =>
                result.type === "multisig"
                  ? getMultisigSigner(
                      {
                        threshold: result.value.threshold,
                        signatories: result.value.addresses,
                      },
                      typedApi.query.Multisig.Multisigs.getValue,
                      typedApi.apis.TransactionPaymentApi.query_info,
                      nestedSigner,
                      {
                        // In case there are nestings, it could happen that when the
                        // tx is executed, the outer multisig expects the call data
                        method: () => "as_multi",
                      }
                    )
                  : getProxySigner({ real: address }, nestedSigner)
              ),
              defaultIfEmpty(null)
            );
          })
        );
      };
      return getMatchingSigner$(topAddress).pipe(
        catchError((ex) => {
          console.error(ex);
          return EMPTY;
        }),
        startWith(null)
      );
    })
  );

// Fallback to subscan
// Limit to 2 concurrent requests
let ongoingSubscanReq = 0;
function subscanProvider(chain: string): MultisigProvider {
  return async (address) => {
    if (ongoingSubscanReq >= 2) return null;
    ongoingSubscanReq++;
    try {
      const result = await fetch(
        `https://${chain}.api.subscan.io/api/v2/scan/search`,
        {
          method: "POST",
          body: JSON.stringify({
            key: address,
          }),
          headers: {
            "x-api-key": import.meta.env.VITE_SUBSCAN_API_KEY,
          },
        }
      ).then((r) => r.json());

      const multisig = result.data?.account?.multisig;
      if (!multisig) return null;

      return {
        addresses: multisig.multi_account_member.map((v: any) => v.address),
        threshold: multisig.threshold,
      };
    } catch (ex) {
      console.error(ex);
      return null;
    } finally {
      ongoingSubscanReq--;
    }
  };
}

function fallbackMultisigProviders(
  providers: MultisigProvider[]
): MultisigProvider {
  return async (address) => {
    for (const provider of providers) {
      const result = await provider(address);
      if (result) return result;
    }
    return null;
  };
}
