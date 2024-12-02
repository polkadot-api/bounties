import {
  ApisTypedef,
  Enum,
  PalletsTypedef,
  SS58String,
  StorageDescriptor,
  TypedApi,
} from "polkadot-api";

type ProxyType = Enum<{
  Any: undefined;
  NonTransfer: undefined;
  Governance: undefined;
  Staking: undefined;
  CancelProxy: undefined;
  Auction: undefined;
  NominationPools: undefined;
}>;

type LinkedAccountsSdkPallets = PalletsTypedef<
  {
    Proxy: {
      /**
       * The set of account proxies. Maps the account which has delegated to the accounts
       * which are being delegated to, together with the amount held on deposit.
       */
      Proxies: StorageDescriptor<
        [Key: SS58String],
        [
          Array<{
            delegate: SS58String;
            proxy_type: ProxyType;
            delay: number;
          }>,
          unknown
        ],
        false
      >;
    };
  },
  {},
  {},
  {},
  {}
>;
type LinkedAccountsSdkDefinition = SdkDefinition<
  LinkedAccountsSdkPallets,
  ApisTypedef<{}>
>;
export type LinkedAccountsSdkTypedApi = TypedApi<LinkedAccountsSdkDefinition>;

type SdkDefinition<P, R> = {
  descriptors: Promise<any> & {
    pallets: P;
    apis: R;
  };
  asset: any;
  metadataTypes: any;
};
