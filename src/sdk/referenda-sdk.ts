import { Binary } from "polkadot-api";
import {
  ReferendaSdkTypedApi,
  ReferendumInfo,
  PreimagesBounded,
} from "./referenda-descriptors";
import { getPreimageResolver } from "./preimages";

type RawOngoingReferendum = (ReferendumInfo & { type: "Ongoing" })["value"];

export interface ReferendumDetails {
  title?: string;
}

export type OngoingReferendum = Omit<RawOngoingReferendum, "proposal"> & {
  id: number;
  proposal: {
    rawValue: PreimagesBounded;
    resolve: () => Promise<Binary>;
    decodedCall: () => Promise<{
      type: string;
      value: {
        type: string;
        value: any;
      };
    }>;
  };
  getDetails: (apiKey: string) => Promise<ReferendumDetails>;
};

export function getReferendaSdk(typedApi: ReferendaSdkTypedApi) {
  const resolvePreimage = getPreimageResolver(
    typedApi.query.Preimage.PreimageFor.getValues
  );

  function enhanceOngoingReferendum(
    id: number,
    referendum: RawOngoingReferendum
  ): OngoingReferendum {
    const resolveProposal = () => resolvePreimage(referendum.proposal);

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
      async getDetails(subscanApiKey: string) {
        const result = await fetch(
          "https://polkadot.api.subscan.io/api/scan/referenda/referendum",
          {
            method: "POST",
            body: JSON.stringify({
              referendum_index: id,
            }),
            headers: {
              "x-api-key": subscanApiKey,
            },
          }
        ).then((r) => r.json());
        // status = "Confirm" => Confirming

        return {
          title: result.data.title,
        };
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
