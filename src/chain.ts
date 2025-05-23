import { polkadot } from "@polkadot-api/descriptors";
import { state } from "@react-rxjs/core";
import { createClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { map, take } from "rxjs";
import { matchedChain } from "./chainRoute";
import { withChopsticksEnhancer } from "./lib/chopsticksEnhancer";

const USE_CHOPSTICKS = import.meta.env.VITE_WITH_CHOPSTICKS;

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
  polkadot: () => polkadotChain,
  kusama: () =>
    import("polkadot-api/chains/ksmcc3").then(({ chainSpec }) =>
      smoldot.addChain({
        chainSpec,
      })
    ),
};
const clientChain = knownChains[matchedChain]();

export const client = createClient(
  withLogsRecorder(
    (...v) => console.debug("relayChain", ...v),
    USE_CHOPSTICKS
      ? withChopsticksEnhancer(getWsProvider("ws://localhost:8132"))
      : getSmProvider(clientChain)
  )
);

export const typedApi = client.getTypedApi(polkadot);

export const hasConnected$ = state(
  client.finalizedBlock$.pipe(
    map(() => true),
    take(1)
  ),
  false
);
