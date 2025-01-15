import { blockHeader } from "@polkadot-api/substrate-bindings";
import { JsonRpcProvider } from "polkadot-api/ws-provider/web";

/**
 * Chopsticks can create block number discontinuities on the chain, which breaks an assumption of polkadot-api.
 * The spec-compliant way of solving this is by emitting a stop event when that happens
 */
export const withChopsticksEnhancer =
  (parent: JsonRpcProvider): JsonRpcProvider =>
  (onMessage) => {
    // if it's chopsticks, we can assume there's immediate finality, and there are no forks or reorgs
    const numbers: Record<string, DeferredPromise> = {};

    const inner = parent(async (msg) => {
      const parsed = JSON.parse(msg);

      if (parsed.id?.startsWith("chopsticks-header-")) {
        const blockHash = parsed.id.replace("chopsticks-header-", "");
        const decodedHeader = blockHeader.dec(parsed.result);

        numbers[blockHash]?.resolve(decodedHeader.number);
        return;
      }

      if (
        parsed.method === "chainHead_v1_followEvent" &&
        parsed.params?.result?.event === "newBlock"
      ) {
        const { blockHash, parentBlockHash } = parsed.params.result;
        numbers[blockHash] = defer();

        inner.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "chopsticks-header-" + blockHash,
            method: "chainHead_v1_header",
            params: [parsed.params.subscription, blockHash],
          })
        );

        if (numbers[parentBlockHash]) {
          const [currentNumber, parentNumber] = await Promise.all([
            numbers[blockHash].promise,
            numbers[parentBlockHash].promise,
          ]);
          console.log([currentNumber, parentNumber]);

          delete numbers[parentBlockHash];

          if (currentNumber > parentNumber + 1) {
            onMessage(
              JSON.stringify({
                ...parsed,
                params: {
                  ...parsed.params,
                  result: {
                    event: "stop",
                  },
                },
              })
            );
            return;
          }
        }
      }

      onMessage(msg);
    });

    return {
      send(message) {
        inner.send(message);
      },
      disconnect() {
        inner.disconnect();
      },
    };
  };

const defer = () => {
  let resolve: Function, reject: Function;
  const promise = new Promise<any>((res, rej) => {
    (resolve = res), (reject = rej);
  });
  return {
    promise,
    resolve: (arg: any) => resolve(arg),
    reject: (arg: any) => reject(arg),
  };
};
type DeferredPromise = ReturnType<typeof defer>;
