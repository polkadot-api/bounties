import { KnownChains } from "./chainRoute";

const polkadot: Record<string, string> = {
  Dwellir: "wss://asset-hub-polkadot-rpc.dwellir.com",
  "Dwellir Tunisia": "wss://statemint-rpc-tn.dwellir.com",
  IBP1: "wss://sys.ibp.network/asset-hub-polkadot",
  IBP2: "wss://asset-hub-polkadot.dotters.network",
  LuckyFriday: "wss://rpc-asset-hub-polkadot.luckyfriday.io",
  OnFinality: "wss://statemint.api.onfinality.io/public-ws",
  Parity: "wss://polkadot-asset-hub-rpc.polkadot.io",
  RadiumBlock: "wss://statemint.public.curie.radiumblock.co/ws",
  Stakeworld: "wss://dot-rpc.stakeworld.io/assethub",
};

const kusama: Record<string, string> = {
  Dwellir: "wss://asset-hub-kusama-rpc.dwellir.com",
  "Dwellir Tunisia": "wss://statemine-rpc-tn.dwellir.com",
  IBP1: "wss://sys.ibp.network/statemine",
  IBP2: "wss://asset-hub-kusama.dotters.network",
  LuckyFriday: "wss://rpc-asset-hub-kusama.luckyfriday.io",
  Parity: "wss://kusama-asset-hub-rpc.polkadot.io",
  RadiumBlock: "wss://statemine.public.curie.radiumblock.co/ws",
  Stakeworld: "wss://ksm-rpc.stakeworld.io/assethub",
};

export const chainRpcs: Record<KnownChains, Record<string, string>> = {
  polkadot,
  kusama,
};
