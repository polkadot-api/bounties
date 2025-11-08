import { typedApi, USE_CHOPSTICKS } from "@/chain";
import { identity$, isVerified } from "@/components/OnChainIdentity";
import { SELECTED_TOKEN } from "@/components/TokenInput";
import { withDefault } from "@react-rxjs/core";
import {
  createLedgerProvider,
  createMimirProvider,
  createPjsWalletProvider,
  createPolkadotVaultProvider,
  createPolkaHub,
  createReadOnlyProvider,
  createSelectedAccountPlugin,
} from "polkahub";
import { defer, map } from "rxjs";

const ss58Format$ = defer(typedApi.constants.System.SS58Prefix);

const selectedAccountPlugin = createSelectedAccountPlugin();
const pjsWalletProvider = createPjsWalletProvider();
const polkadotVaultProvider = createPolkadotVaultProvider();
const readOnlyProvider = createReadOnlyProvider({
  fakeSigner: USE_CHOPSTICKS,
});
const ledgerAccountProvider = createLedgerProvider(
  async () => {
    const module = await import("@ledgerhq/hw-transport-webhid");
    return module.default.create();
  },
  async () => ({
    decimals: SELECTED_TOKEN.decimals,
    tokenSymbol: SELECTED_TOKEN.symbol,
  })
);
export const mimirProvider = createMimirProvider("Bounties");

export const polkaHub = createPolkaHub(
  [
    selectedAccountPlugin,
    pjsWalletProvider,
    polkadotVaultProvider,
    readOnlyProvider,
    ledgerAccountProvider,
    mimirProvider,
  ],
  {
    getIdentity: (address) =>
      identity$(address).pipe(
        map((identity) =>
          identity
            ? {
                name: identity.displayName,
                verified: isVerified(identity) ?? false,
              }
            : null
        )
      ),
    ss58Format: ss58Format$,
  }
);

export const selectedAccount$ =
  selectedAccountPlugin.selectedAccount$.pipeState(withDefault(null));
