export type KnownChains = "polkadot" | "kusama";
const knownChains: Array<KnownChains> = ["polkadot", "kusama"];

export const routeChain = knownChains.find((c) =>
  location.pathname.startsWith("/" + c)
);
export const matchedChain = routeChain ?? "polkadot";
