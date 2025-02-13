import { typedApi } from "@/chain";
import { Binary, Transaction } from "polkadot-api";

export function remark(tx: Transaction<any, string, string, unknown>) {
  return typedApi.tx.Utility.batch({
    calls: [
      tx.decodedCall,
      typedApi.tx.System.remark_with_event({
        remark: Binary.fromText(
          "Transaction created with https://bounties.usepapi.app/"
        ),
      }).decodedCall,
    ],
  });
}
