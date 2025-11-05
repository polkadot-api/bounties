import { dotAh } from "@polkadot-api/descriptors";
import { state } from "@react-rxjs/core";
import { createClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { getWsProvider } from "polkadot-api/ws-provider";
import { map, take } from "rxjs";
import { matchedChain } from "./chainRoute";
import { chainRpcs } from "./chainRpcs";
import { withChopsticksEnhancer } from "./lib/chopsticksEnhancer";

export const USE_CHOPSTICKS = import.meta.env.VITE_WITH_CHOPSTICKS;

export const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message);
  },
  forbidWs: true,
});

const polkadotChainSpec = import("polkadot-api/chains/polkadot");
export const polkadotChain = polkadotChainSpec.then(({ chainSpec }) =>
  smoldot.addChain({
    chainSpec,
  })
);

const knownChains = {
  polkadot: () =>
    Promise.all([
      polkadotChain,
      import("polkadot-api/chains/polkadot_asset_hub"),
    ]).then(([chain, { chainSpec }]) =>
      smoldot.addChain({
        chainSpec,
        potentialRelayChains: [chain],
      })
    ),
  kusama: () =>
    import("polkadot-api/chains/ksmcc3").then(({ chainSpec }) =>
      smoldot.addChain({
        chainSpec,
      })
    ),
};

export const useLightClient =
  new URLSearchParams(location.search).get("smoldot") === "true";
function getProvider() {
  if (USE_CHOPSTICKS) {
    return withChopsticksEnhancer(getWsProvider("ws://localhost:8132"));
  }

  if (useLightClient) {
    return getSmProvider(knownChains[matchedChain]());
  }

  const urls = Object.values(chainRpcs[matchedChain]);
  return withPolkadotSdkCompat(getWsProvider(shuffleArray(urls)));
}

export const client = createClient(
  withLogsRecorder((...v) => console.debug("relayChain", ...v), getProvider())
);

export const typedApi = client.getTypedApi(dotAh);

export const hasConnected$ = state(
  client.finalizedBlock$.pipe(
    map(() => true),
    take(1)
  ),
  false
);

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((v) => ({
      v,
      p: Math.random(),
    }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v);
}
