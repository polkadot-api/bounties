import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { spawn } from "child_process";
import {
  AccountId,
  Binary,
  createClient,
  getSs58AddressInfo,
} from "polkadot-api";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import readline from "readline";
import {
  getMultisigAccountId,
  sortMultisigSignatories,
} from "@polkadot-api/substrate-bindings";

const alice_mnemonic =
  "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const entropy = mnemonicToEntropy(alice_mnemonic);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);
const alice = derive("//Alice");
const aliceSigner = getPolkadotSigner(alice.publicKey, "Sr25519", alice.sign);

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const BOB = "14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3";
const PORT = 8132;

const addrToU8 = (address: string) => {
  const info = getSs58AddressInfo(address);
  if (!info.isValid) throw new Error("Wrong SS58");
  return info.publicKey;
};
const signatories = [
  addrToU8(ALICE),
  addrToU8(BOB),
  addrToU8("5FxrUu1PUugUYs6HQ83bDswjGLyHYTEzm7yqmrkKVPaYe71Y"),
];
const id = getMultisigAccountId({
  threshold: 2,
  signatories,
});
console.log(AccountId().dec(id));

const sorted = sortMultisigSignatories(signatories);
sorted.forEach((id) => console.log(AccountId().dec(id)));

process.exit(0);

const client = createClient(getWsProvider(`ws://localhost:${PORT}`));
const api = client.getUnsafeApi();
await api.runtimeToken;
console.log("Runtime loaded");

await client._request("dev_newBlock", []);

client.destroy();
