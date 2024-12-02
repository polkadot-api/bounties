import {
  ApisTypedef,
  Binary,
  Enum,
  FixedSizeArray,
  PalletsTypedef,
  SS58String,
  StorageDescriptor,
  TypedApi,
} from "polkadot-api";

type WhoAmount = {
  who: SS58String;
  amount: bigint;
};
type BasicReferndumInfo = [
  number,
  WhoAmount | undefined,
  WhoAmount | undefined
];

type PolkadotRuntimeOriginCaller = Enum<{
  system: Enum<{
    Root: undefined;
    Signed: SS58String;
    None: undefined;
  }>;
  Origins: Enum<{
    StakingAdmin: undefined;
    Treasurer: undefined;
    FellowshipAdmin: undefined;
    GeneralAdmin: undefined;
    AuctionAdmin: undefined;
    LeaseAdmin: undefined;
    ReferendumCanceller: undefined;
    ReferendumKiller: undefined;
    SmallTipper: undefined;
    BigTipper: undefined;
    SmallSpender: undefined;
    MediumSpender: undefined;
    BigSpender: undefined;
    WhitelistedCaller: undefined;
    WishForChange: undefined;
  }>;
  ParachainsOrigin: Enum<{
    Parachain: number;
  }>;
  XcmPallet: unknown;
  Void: undefined;
}>;

export type ReferendumInfoProposal = Enum<{
  Legacy: {
    hash: Binary;
  };
  Inline: Binary;
  Lookup: {
    hash: Binary;
    len: number;
  };
}>;

export type ReferendumInfo = Enum<{
  Ongoing: {
    track: number;
    origin: PolkadotRuntimeOriginCaller;
    proposal: ReferendumInfoProposal;
    enactment: Enum<{
      At: number;
      After: number;
    }>;
    submitted: number;
    submission_deposit: WhoAmount;
    decision_deposit?: WhoAmount | undefined;
    deciding?:
      | {
          since: number;
          confirming?: number | undefined;
        }
      | undefined;
    tally: {
      ayes: bigint;
      nays: bigint;
      support: bigint;
    };
    in_queue: boolean;
    alarm?: [number, FixedSizeArray<2, number>] | undefined;
  };
  Approved: BasicReferndumInfo;
  Rejected: BasicReferndumInfo;
  Cancelled: BasicReferndumInfo;
  TimedOut: BasicReferndumInfo;
  Killed: number;
}>;

type ReferendaSdkPallets = PalletsTypedef<
  {
    Preimage: {
      PreimageFor: StorageDescriptor<[Key: [Binary, number]], Binary, true>;
    };
    Referenda: {
      /**
       * Information concerning any given referendum.
       */
      ReferendumInfoFor: StorageDescriptor<[Key: number], ReferendumInfo, true>;
    };
  },
  {},
  {},
  {},
  {}
>;
type ReferendaSdkDefinition = SdkDefinition<
  ReferendaSdkPallets,
  ApisTypedef<{}>
>;
export type ReferendaSdkTypedApi = TypedApi<ReferendaSdkDefinition>;

type SdkDefinition<P, R> = {
  descriptors: Promise<any> & {
    pallets: P;
    apis: R;
  };
  asset: any;
  metadataTypes: any;
};
