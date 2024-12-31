import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { getLinkedAccountsSdk } from "@/sdk/linked-accounts-sdk";
import { getMultisigSigner, getProxySigner } from "@polkadot-api/meta-signers";
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

const linkedAccountsSdk = getLinkedAccountsSdk(typedApi);

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
