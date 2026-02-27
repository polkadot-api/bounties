import { dotAh } from "@polkadot-api/descriptors"
import { state } from "@react-rxjs/core"
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getSmProvider } from "polkadot-api/sm-provider"
import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"
import { getWsProvider } from "polkadot-api/ws"
import { map, take } from "rxjs"
import { matchedChain } from "./chainRoute"
import { chainRpcs } from "./chainRpcs"
import { withChopsticksEnhancer } from "./lib/chopsticksEnhancer"

export const USE_CHOPSTICKS = import.meta.env.VITE_WITH_CHOPSTICKS

export const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message)
  },
  forbidWs: true,
})

const knownChains = {
  polkadot: () =>
    Promise.all([
      import("polkadot-api/chains/polkadot").then(({ chainSpec }) =>
        smoldot.addChain({ chainSpec }),
      ),
      import("polkadot-api/chains/polkadot_asset_hub"),
    ]).then(([relay, { chainSpec }]) =>
      smoldot.addChain({
        chainSpec,
        potentialRelayChains: [relay],
      }),
    ),
  kusama: () =>
    Promise.all([
      import("polkadot-api/chains/kusama").then(({ chainSpec }) =>
        smoldot.addChain({ chainSpec }),
      ),
      import("polkadot-api/chains/kusama_asset_hub"),
    ]).then(([relay, { chainSpec }]) =>
      smoldot.addChain({
        chainSpec,
        potentialRelayChains: [relay],
      }),
    ),
}

export const useLightClient =
  window.localStorage.getItem("use-smoldot") === "true"
function getProvider() {
  if (USE_CHOPSTICKS) {
    return withChopsticksEnhancer(getWsProvider("ws://localhost:8132"))
  }

  if (useLightClient) {
    return getSmProvider(knownChains[matchedChain])
  }

  const urls = Object.values(chainRpcs[matchedChain])
  return getWsProvider(shuffleArray(urls))
}

export const client = createClient(
  withLogsRecorder((...v) => console.debug("relayChain", ...v), getProvider()),
)

export const typedApi = client.getTypedApi(dotAh)

export const hasConnected$ = state(
  client.finalizedBlock$.pipe(
    map(() => true),
    take(1),
  ),
  false,
)

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((v) => ({
      v,
      p: Math.random(),
    }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v)
}
