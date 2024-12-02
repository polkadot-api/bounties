import { typedApi } from "@/chain";
import { selectedAccount$ } from "@/components/AccountSelector";
import { multixSigner } from "@/lib/multixSigner";
import { getLinkedAccountsSdk } from "@/sdk/linked-accounts-sdk";
import { toHex } from "@polkadot-api/utils";
import { getSs58AddressInfo, PolkadotSigner } from "polkadot-api";
import { filter, map, merge, Observable, of, switchMap } from "rxjs";

const linkedAccountsSdk = getLinkedAccountsSdk(typedApi);

export const getNestedLinkedAccounts$ =
  linkedAccountsSdk.getNestedLinkedAccounts$;

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

        return linkedAccountsSdk.getLinkedAccounts$(address).pipe(
          switchMap((result) => {
            if (result.type === "root") return of(null);

            return merge(
              ...result.value.addresses.map((inner) =>
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
