import { typedApi } from "@/chain";
import { matchedChain } from "@/chainRoute";
import { getMultisigSigner, getProxySigner } from "@polkadot-api/meta-signers";
import {
  createLinkedAccountsSdk,
  fallbackMultisigProviders,
  novasamaProvider,
  subscanProvider,
  throttleMultisigProvider,
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
import { selectedAccount$ } from "./account";

const linkedAccountsSdk = createLinkedAccountsSdk(
  typedApi,
  fallbackMultisigProviders(
    novasamaProvider(matchedChain),
    throttleMultisigProvider(
      subscanProvider(matchedChain, import.meta.env.VITE_SUBSCAN_API_KEY),
      2
    )
  )
);

export const getNestedLinkedAccounts$ =
  linkedAccountsSdk.getNestedLinkedAccounts$;

export const getLinkedSigner$ = (topAddress: string) =>
  selectedAccount$.pipe(
    switchMap((account) => {
      const signer = account?.signer;
      if (!signer) return of(null);

      const getMatchingSigner$ = (
        address: string
      ): Observable<PolkadotSigner | null> => {
        const info = getSs58AddressInfo(address);
        if (!info.isValid) return of(null);
        if (toHex(info.publicKey) === toHex(signer.publicKey))
          return of(signer);

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
