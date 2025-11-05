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
import { createWriteStream } from "fs";

const alice_mnemonic =
  "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const entropy = mnemonicToEntropy(alice_mnemonic);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);
const alice = derive("//Alice");
const aliceSigner = getPolkadotSigner(alice.publicKey, "Sr25519", alice.sign);

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const BOB = "14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3";
const MULTISIG = "15ZXdJLyU3vBcRzRKE8cGBSMxzAe2Ht6kvdTAvN76qRwt7Bb";

const ENDPOINT = "wss://sys.ibp.network/asset-hub-paseo";
const PORT = 8132;

const logStream = createWriteStream("./chopsticks.log");
const logStreamErr = createWriteStream("./chopsticks_err.log");
const chopsticksProcess = spawn("pnpm", [
  "chopsticks",
  `--endpoint=${ENDPOINT}`,
  `--port=${PORT}`,
]);
chopsticksProcess.stdout.pipe(logStream);
chopsticksProcess.stderr.pipe(logStreamErr);

console.log(
  "Connecting to chopsticks… It might take a few retries until the chain is up"
);
let client = createClient(getWsProvider(`ws://localhost:${PORT}`));
let api = client.getUnsafeApi();

try {
  await api.runtimeToken;
  console.log("Runtime loaded");

  console.log("Get treasury accountId");
  const treasuryId = await api.constants.Treasury.PalletId();
  const idHex = treasuryId.asHex();
  const idPk = "0x" + ("6d6f646c" + idHex.slice(2)).padEnd(32 * 2, "0");
  const treasuryAddress = AccountId().dec(Binary.fromHex(idPk).asBytes());

  console.log("Set ALICE as sudo key and add funds to accounts");
  const aliceInfo = getSs58AddressInfo(ALICE);
  if (!aliceInfo.isValid) throw new Error("Alice address not valid");

  const alicePk = Binary.fromBytes(aliceInfo.publicKey).asHex();
  const accountsBalance = 10_000_0000000000n;
  const treasuryBalance = 100_000_000_0000000000n;
  await client._request("dev_setStorage", [
    {
      sudo: {
        key: alicePk,
      },
      system: {
        account: [
          [
            [ALICE],
            { providers: 1, data: { free: accountsBalance.toString() } },
          ],
          [[BOB], { providers: 1, data: { free: accountsBalance.toString() } }],
          [
            [MULTISIG],
            { providers: 1, data: { free: accountsBalance.toString() } },
          ],
          [
            [treasuryAddress],
            { providers: 1, data: { free: treasuryBalance.toString() } },
          ],
        ],
      },
    },
  ]);

  console.log("Ready, type help to get the list of commands.");
  process.stdout.write("> ");

  const rl = readline.createInterface({
    input: process.stdin, //or fileStream
    output: process.stdout,
  });

  const jumpBlocks = async (height: number, count?: number) => {
    await client._request("dev_newBlock", [
      {
        count,
        unsafeBlockHeight: height,
      },
    ]);

    // Because the height jump, we have to restart the client
    // otherwise the block height will be wrong on new tx
    console.log("Restarting client");
    client.destroy();
    client = createClient(getWsProvider(`ws://localhost:${PORT}`));
    api = client.getUnsafeApi();
    await api.runtimeToken;
  };

  const approveReferendum = async (id: number) => {
    console.log(`Loading referendum ${id} status`);
    const referendumInfo = await api.query.Referenda.ReferendumInfoFor.getValue(
      id
    );
    if (!referendumInfo) {
      console.log("Referendum not found");
      return;
    }
    if (referendumInfo?.type !== "Ongoing") {
      console.log("Referendum ended");
      // TODO try unlock funds
      return;
    }

    if (!referendumInfo.value.decision_deposit) {
      console.log("Placing decision deposit");
      await api.tx.Referenda.place_decision_deposit({
        index: id,
      }).signAndSubmit(aliceSigner);
      return approveReferendum(id);
    }
    if (!referendumInfo.value.deciding) {
      console.log("Jump to start deciding phase");
      await jumpBlocks(referendumInfo.value.alarm![0]);
      return approveReferendum(id);
    }
    if (
      !referendumInfo.value.tally.support ||
      referendumInfo.value.tally.nays >= referendumInfo.value.tally.ayes
    ) {
      console.log("Voting aye");
      await api.tx.ConvictionVoting.vote({
        poll_index: id,
        vote: {
          type: "Standard",
          value: {
            vote: 0b1000_0000,
            balance: 5_000_0000000000n,
          },
        },
      }).signAndSubmit(aliceSigner);
      return approveReferendum(id);
    }
    if (!referendumInfo.value.deciding.confirming) {
      console.log("Jump to confirm phase");
      await jumpBlocks(referendumInfo.value.alarm![0]);
      return approveReferendum(id);
    }

    console.log("Jump to end confirm phase");
    await jumpBlocks(referendumInfo.value.alarm![0]);

    const currentFinalized = await client.getFinalizedBlock();
    const period = (await api.constants.Referenda.Tracks()).find(
      ([id]) => id === referendumInfo.value.track
    )![1].min_enactment_period;
    console.log("Wait one block");
    await client._request("dev_newBlock", []);

    console.log("Jump to enactment", currentFinalized.number + period);
    await jumpBlocks(currentFinalized.number + period);

    console.log("unlock funds");
    const result = await api.tx.Utility.batch_all({
      calls: [
        api.tx.ConvictionVoting.remove_vote({
          index: id,
          class: referendumInfo.value.track,
        }).decodedCall,
        api.tx.ConvictionVoting.unlock({
          class: referendumInfo.value.track,
          target: {
            type: "Id",
            value: ALICE,
          },
        }).decodedCall,
        api.tx.Referenda.refund_decision_deposit({
          index: id,
        }).decodedCall,
      ],
    }).signAndSubmit(aliceSigner);

    if (result.ok) {
      console.log("Success");
    } else {
      console.log("Couldn't unlock, probably something went wrong");
    }
  };

  for await (const line of rl) {
    try {
      const [command, ...args] = line.split(" ");
      switch (command) {
        case "ts":
        case "treasury_spend": {
          console.log("Jumping to next spend period");

          const currentFinalized = await client.getFinalizedBlock();
          const period = await api.constants.Treasury.SpendPeriod();
          const nextSpendPeriod =
            (Math.floor(currentFinalized.number / period) + 1) * period;

          await jumpBlocks(nextSpendPeriod, 2);
          break;
        }
        case "er":
        case "exec_referendum": {
          const id = Number(args[0]);
          console.log(`Loading referendum ${id} call data`);
          const referendumInfo =
            await api.query.Referenda.ReferendumInfoFor.getValue(id);
          console.log(referendumInfo);

          const call =
            referendumInfo.value.proposal.type === "Inline"
              ? referendumInfo.value.proposal.value
              : await (async () => {
                  throw new Error("TODO implement preimages");
                })();
          const decodedCall = (await api.txFromCallData(call)).decodedCall;

          console.log("Submitting referendum transaction as root");
          await api.tx.Sudo.sudo({
            call: decodedCall,
          })
            .signAndSubmit(aliceSigner)
            .then(
              (res) => {
                console.log(res.events);
                if (res.ok) {
                  console.log("Success");
                } else {
                  console.log("Failed", res.dispatchError);
                }
              },
              (err) => {
                console.log("Errored", err);
              }
            );
          break;
        }
        case "ar":
        case "approve_referendum": {
          const id = Number(args[0]);
          approveReferendum(id);
          break;
        }
        case "nb":
        case "new_block": {
          console.log("Producing new block");
          await client._request("dev_newBlock", []);
          break;
        }
        case "jb":
        case "jump_block": {
          const height = Number(args[0]);
          console.log(`Jumping to block ${height}`);
          await jumpBlocks(height);
          break;
        }
        case "help":
          console.log();
          console.log("er {id}: Execute the call of referendum {id} as sudo");
          console.log("nb: Produce a new block");
          console.log("ts: Jump to the next treasury spend period");
          console.log("jb {height}: Advance block height to {height}");
          console.log();
          break;
        default:
          console.log("Command " + command + " not found");
      }

      process.stdout.write("> ");
    } catch (ex) {
      console.log("Command errored: " + ex);
    }
  }
} catch (ex) {
  console.error(ex);
  chopsticksProcess.kill();
}

client.destroy();
