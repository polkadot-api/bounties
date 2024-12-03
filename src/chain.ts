import { polkadot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { withLogsRecorder } from "polkadot-api/logs-provider";

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

export const client = createClient(
  withLogsRecorder(
    (...v) => console.debug("relayChain", ...v),
    getSmProvider(polkadotChain)
  )
);

export const typedApi = client.getTypedApi(polkadot);
