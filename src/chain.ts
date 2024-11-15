import { polkadot } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";

const smoldot = startFromWorker(new SmWorker(), {
  logCallback: (level, target, message) => {
    console.debug("smoldot[%s(%s)] %s", target, level, message);
  },
  forbidWs: true,
});

const polkadotChain = import("polkadot-api/chains/polkadot");

export const client = createClient(
  getSmProvider(
    polkadotChain.then(({ chainSpec }) =>
      smoldot.addChain({
        chainSpec,
      })
    )
  )
);

export const typedApi = client.getTypedApi(polkadot);
