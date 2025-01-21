# Polkadot Bounties

Polkadot Bounties is a dApp that shows the bounties in Polkadot and lets curators manage it.

It's an example for using [Polkadot-API](https://papi.how/) and [Polkadot-API SDKs](https://papi.how/sdks/intro/), as it combines Bounties, Referenda and Linked accounts.

## Getting started

It's built with React and Vite, so to run it in dev mode:

```sh
pnpm i
pnpm dev
```

## Chopsticks

This project has a server based on [Chopsticks](https://github.com/AcalaNetwork/chopsticks) that creates a local fork of paseo, sets ALICE as the sudo key, and gives ALICE, BOB and the chain treasury account enough funds to manage bounties.

To run chopsticks with this mode:

```sh
cd chopsticks
pnpm i
pnpm start
```

After a few seconds, it will be ready, and it will prompt for a command, which can be used to control the chain. The commands are:

- er {id}: Execute the call of referendum {id} as sudo
- ts: Jump to the next treasury spend period
- nb: Produce a new block
- jb {height}: Advance block height to {height}

The two most useful commands for this project is `er` (execute referendum) and `ts` (treasury spend).

To run the UI targeting the local chopsticks instance:

```sh
pnpm dev-local
```
