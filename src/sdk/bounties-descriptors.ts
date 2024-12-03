import {
  ApisTypedef,
  Binary,
  Enum,
  FixedSizeBinary,
  PalletsTypedef,
  SS58String,
  StorageDescriptor,
  TypedApi,
} from "polkadot-api";

export type BountiesBountyStatus = Enum<{
  Proposed: undefined;
  Approved: undefined;
  Funded: undefined;
  CuratorProposed: {
    curator: SS58String;
  };
  Active: {
    curator: SS58String;
    update_due: number;
  };
  PendingPayout: {
    curator: SS58String;
    beneficiary: SS58String;
    unlock_at: number;
  };
}>;
export interface BountyWithoutDescription {
  proposer: SS58String;
  value: bigint;
  fee: bigint;
  curator_deposit: bigint;
  bond: bigint;
  status: BountiesBountyStatus;
}

type BountiesSdkPallets = PalletsTypedef<
  {
    Bounties: {
      /**
       * Number of bounty proposals that have been made.
       */
      BountyCount: StorageDescriptor<[], number, false>;
      /**
       * Bounties that have been made.
       */
      Bounties: StorageDescriptor<
        [Key: number],
        BountyWithoutDescription,
        true
      >;
      /**
       * The description of each bounty.
       */
      BountyDescriptions: StorageDescriptor<[Key: number], Binary, true>;
    };
  },
  {},
  {},
  {},
  {}
>;
type BountiesSdkDefinition = SdkDefinition<BountiesSdkPallets, ApisTypedef<{}>>;
export type BountiesSdkTypedApi = TypedApi<BountiesSdkDefinition>;

type SdkDefinition<P, R> = {
  descriptors: Promise<any> & {
    pallets: P;
    apis: R;
  };
  asset: any;
  metadataTypes: any;
};

export type MultiAddress = Enum<{
  Id: SS58String;
  Index: undefined;
  Raw: Binary;
  Address32: FixedSizeBinary<32>;
  Address20: FixedSizeBinary<20>;
}>;
