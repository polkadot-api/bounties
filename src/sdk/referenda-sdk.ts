import { Binary } from "polkadot-api";
import {
  ReferendaSdkTypedApi,
  ReferendumInfo,
  ReferendumInfoProposal,
} from "./referenda-descriptors";

type RawOngoingReferendum = (ReferendumInfo & { type: "Ongoing" })["value"];

export type OngoingReferendum = Omit<RawOngoingReferendum, "proposal"> & {
  id: number;
  proposal: {
    rawValue: ReferendumInfoProposal;
    resolve: () => Promise<Binary>;
    decodedCall: () => Promise<{
      type: string;
      value: {
        type: string;
        value: any;
      };
    }>;
  };
};

export function getReferendaSdk(typedApi: ReferendaSdkTypedApi) {
  const preimageCache = new Map<string, Promise<Binary>>();
  function enhanceOngoingReferendum(
    id: number,
    referendum: RawOngoingReferendum
  ): OngoingReferendum {
    const resolveProposal = async () => {
      const proposal = referendum.proposal;
      if (proposal.type === "Legacy")
        throw new Error("Legacy proposals can't be resolved");
      if (proposal.type === "Inline") return proposal.value;

      const cached = preimageCache.get(proposal.value.hash.asHex());
      if (cached) return cached;
      const promise = (async () => {
        const result = await typedApi.query.Preimage.PreimageFor.getValue([
          proposal.value.hash,
          proposal.value.len,
        ]);
        if (!result)
          throw new Error(`Preimage ${proposal.value.hash} not found`);
        return result;
      })();
      preimageCache.set(proposal.value.hash.asHex(), promise);
      return promise;
    };

    return {
      ...referendum,
      id,
      proposal: {
        rawValue: referendum.proposal,
        resolve: resolveProposal,
        decodedCall: async () => {
          const proposal = await resolveProposal();
          const token = await typedApi.compatibilityToken;

          return typedApi.txFromCallData(proposal, token).decodedCall;
        },
      },
    };
  }

  async function getOngoingReferenda() {
    const entries =
      await typedApi.query.Referenda.ReferendumInfoFor.getEntries();

    return entries
      .map(({ keyArgs: [id], value: info }): OngoingReferendum | null => {
        if (info.type !== "Ongoing") return null;

        return enhanceOngoingReferendum(id, info.value);
      })
      .filter((v) => !!v);
  }

  return {
    getOngoingReferenda,
  };
}

export type ReferendaSdk = ReturnType<typeof getReferendaSdk>;
