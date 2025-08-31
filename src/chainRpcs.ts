import { KnownChains } from "./chainRoute";

const polkadot: Record<string, string> = {
  Allnodes: "wss://polkadot-rpc.publicnode.com",
  Blockops: "wss://polkadot-public-rpc.blockops.network/ws",
  Dwellir: "wss://polkadot-rpc.dwellir.com",
  "Dwellir Tunisia": "wss://polkadot-rpc-tn.dwellir.com",
  IBP1: "wss://rpc.ibp.network/polkadot",
  IBP2: "wss://polkadot.dotters.network",
  LuckyFriday: "wss://rpc-polkadot.luckyfriday.io",
  Stakeworld: "wss://dot-rpc.stakeworld.io",
};

const kusama: Record<string, string> = {
  Allnodes: "wss://kusama-rpc.publicnode.com",
  Dwellir: "wss://kusama-rpc.dwellir.com",
  "Dwellir Tunisia": "wss://kusama-rpc-tn.dwellir.com",
  IBP1: "wss://rpc.ibp.network/kusama",
  IBP2: "wss://kusama.dotters.network",
  LuckyFriday: "wss://rpc-kusama.luckyfriday.io",
  Stakeworld: "wss://ksm-rpc.stakeworld.io",
};

export const chainRpcs: Record<KnownChains, Record<string, string>> = {
  polkadot,
  kusama,
};
