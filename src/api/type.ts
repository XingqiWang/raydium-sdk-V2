import { FarmRewardInfo, FarmVersion } from "../raydium/farm";

/* ================= liquidity ================= */
export type LiquidityVersion = 4 | 5;

export interface ApiPoolInfoV4 {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  version: 4;
  programId: string;
  authority: string;
  openOrders: string;
  targetOrders: string;
  baseVault: string;
  quoteVault: string;
  withdrawQueue: string;
  lpVault: string;
  marketVersion: 3;
  marketProgramId: string;
  marketId: string;
  marketAuthority: string;
  marketBaseVault: string;
  marketQuoteVault: string;
  marketBids: string;
  marketAsks: string;
  marketEventQueue: string;
  lookupTableAccount: string;
}

/* ================= farm ================= */
export interface FarmRewardInfoV6 {
  rewardMint: string;
  rewardVault: string;
  rewardOpenTime: number;
  rewardEndTime: number;
  rewardPerSecond: number;
  rewardSender: string;
}

export interface ApiStakePoolInfo {
  // base
  id: string;
  symbol: string;
  lpMint: string;
  // version
  version: FarmVersion;
  programId: string;
  // keys
  authority: string;
  lpVault: string;
  rewardInfos: FarmRewardInfo[] | FarmRewardInfoV6[];
  // status
  upcoming: boolean;
}

export interface ApiClmmConfigInfo {
  id: string;
  index: number;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
  fundFeeRate: number;
  fundOwner: string;
  description: string;
}

export interface ApiClmmPoolsItemStatistics {
  volume: number;
  volumeFee: number;
  feeA: number;
  feeB: number;
  feeApr: number;
  rewardApr: {
    A: number;
    B: number;
    C: number;
  };
  apr: number;
  priceMin: number;
  priceMax: number;
}

export interface ApiClmmPoolInfo {
  id: string;
  mintProgramIdA: string;
  mintProgramIdB: string;
  mintA: string;
  mintB: string;
  mintDecimalsA: number;
  mintDecimalsB: number;
  ammConfig: ApiClmmConfigInfo;
  rewardInfos: {
    mint: string;
    programId: string;
  }[];
  day: ApiClmmPoolsItemStatistics;
  week: ApiClmmPoolsItemStatistics;
  month: ApiClmmPoolsItemStatistics;
  tvl: number;
  lookupTableAccount: string;
}

/** ====== v3 api types ======= */
export interface ApiV3PageIns<T> {
  count: number;
  hasNextPage: boolean;
  data: T[];
}

export enum JupTokenType {
  ALL = "all",
  Strict = "strict",
}
export type PoolsApiReturn = ApiV3PageIns<ApiV3PoolInfoItem>;
export interface SearchPoolsApiReturn {
  hasNextPage: boolean;
  data: ApiV3PoolInfoItem[];
  bestUse: "id" | "mint" | null;
  search: string;
}

export interface TransferFeeDataBaseType {
  transferFeeConfigAuthority: string;
  withdrawWithheldAuthority: string;
  withheldAmount: string;
  olderTransferFee: {
    epoch: string;
    maximumFee: string;
    transferFeeBasisPoints: number;
  };
  newerTransferFee: {
    epoch: string;
    maximumFee: string;
    transferFeeBasisPoints: number;
  };
}

type TagsItem = "hasFreeze" | "hasTransferFee";
type ExtensionsItem = {
  coingeckoId?: string;
  feeConfig?: TransferFeeDataBaseType;
};

export type ApiV3Token = {
  chainId: number;
  address: string;
  programId: string;
  logoURI: string;
  symbol: string;
  name: string;
  decimals: number;
  tags: TagsItem[];
  extensions: ExtensionsItem;
};

export type ApiV3TokenRes = {
  mintList: ApiV3Token[];
  blacklist: ApiV3Token[];
};

export interface ApiV3PoolInfoCountItem {
  volume: number;
  volumeQuote: number;
  volumeFee: number;
  apr: number;
  feeApr: number;
  priceMin: number;
  priceMax: number;
  rewardApr: number[];
}

type PoolTypeItem = "StablePool" | "OpenBookMarket";

type FarmRewardInfoOld = {
  mint: ApiV3Token;
  perSecond: number;
};

export type PoolFarmRewardInfo = FarmRewardInfoOld & {
  startTime?: number;
  endTime?: number;
};

export interface PoolRewardInfoItem {
  mint: ApiV3Token;
  perSecond?: number;
  startTime?: number;
  endTime?: number;
}

export interface ApiV3PoolInfoBaseItem {
  programId: string;
  id: string;
  mintA: ApiV3Token;
  mintB: ApiV3Token;
  rewardDefaultInfos: PoolFarmRewardInfo[];
  price: number;
  mintAmountA: number;
  mintAmountB: number;
  feeRate: number;
  openTime: number;
  tvl: number;

  day: ApiV3PoolInfoCountItem;
  week: ApiV3PoolInfoCountItem;
  month: ApiV3PoolInfoCountItem;
  pooltype: PoolTypeItem[];

  farmUpcomingCount: number;
  farmOngoingCount: number;
  farmFinishedCount: number;
}
export type ApiV3PoolInfoConcentratedItem = ApiV3PoolInfoBaseItem & {
  type: "Concentrated";
  config: ApiClmmConfigV3;
};
export type ApiV3PoolInfoStandardItem = ApiV3PoolInfoBaseItem & {
  type: "Standard";
  marketId: string;
  lpPrice: number;
  lpAmount: number;
  lpMint: ApiV3Token;
};
export type ApiV3PoolInfoItem = ApiV3PoolInfoConcentratedItem | ApiV3PoolInfoStandardItem;

export interface FetchPoolParams {
  type?: "all" | "concentrated" | "standard";
  sort?:
    | "liquidity"
    | "volume_24h"
    | "volume_7d"
    | "volume_30d"
    | "fee_24h"
    | "fee_7d"
    | "fee_30d"
    | "apr_24h"
    | "apr_7d"
    | "apr_30d";
  order?: "desc" | "asc";
  pageSize?: number;
  page?: number;
}

// liquidity line
export interface Point {
  time: number;
  liquidity: number;
}
export interface LiquidityLineApi {
  count: number;
  line: Point[];
}

// pool key
interface Base {
  programId: string;
  id: string;
  mintA: ApiV3Token;
  mintB: ApiV3Token;
  lookupTableAccount?: string;
  openTime: number;
  vault: { A: string; B: string };
}
interface AmmKeys {
  authority: string;
  openOrders: string;
  targetOrders: string;
  withdrawQueue: string;
  mintLp: ApiV3Token;
  vault: { Lp: string }; // stable Publickey default
}
interface MarketKeys {
  marketProgramId: string;
  marketId: string;
  marketAuthority: string;
  marketBaseVault: string;
  marketQuoteVault: string;
  marketBids: string;
  marketAsks: string;
  marketEventQueue: string;
}
export type AmmV4Keys = Base & AmmKeys & MarketKeys;
export type AmmV5Keys = Base & AmmKeys & MarketKeys & { modelDataAccount: string };
interface ClmmRewardType {
  mint: ApiV3Token;
  vault: string;
}
export type ClmmKeys = Base & { config: ApiClmmConfigV3; rewardInfos: ClmmRewardType[] };
export type PoolKeys = AmmV4Keys | AmmV5Keys | ClmmKeys;

// clmm config
export interface ApiClmmConfigV3 {
  id: string;
  index: number;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
  fundFeeRate: number;
  description: string;
  defaultRange: number;
  defaultRangePoint: number[];
}

export interface RpcItemA {
  url: string;
  weight: number;
  batch: boolean;
  name: string;
}
export interface RpcItemB {
  url: string;
  batch: boolean;
  name: string;
}

type RpcStrategy = "speed" | "first";
type RpcTypeWeight = { strategy: "weight"; rpcs: RpcItemA[] };
type RpcTypeOther = { strategy: RpcStrategy; rpcs: RpcItemB[] };
export type RpcType = RpcTypeWeight | RpcTypeOther;

export type FarmRewardTypeV6Key = "Standard SPL" | "Option tokens";

export interface RewardKeyInfoV345 {
  mint: ApiV3Token;
  vault: string;
  type: FarmRewardTypeV6Key;
  perSecond: number;
  perBlock: number;
}
export interface RewardKeyInfoV6 {
  mint: ApiV3Token;
  vault: string;
  type: FarmRewardTypeV6Key;
  perSecond: number;
  openTime: number;
  endTime: number;
  sender: string;
}
interface FormatFarmKeyOutBase {
  programId: string;
  id: string;
  symbolMints: ApiV3Token[];
  lpMint: ApiV3Token;
  authority: string;
  lpVault: string;
}
type FormatFarmKeyOutV345 = FormatFarmKeyOutBase & {
  rewardInfos: RewardKeyInfoV345[];
};
type FormatFarmKeyOutV6 = FormatFarmKeyOutBase & {
  config: {
    periodMax: number;
    periodMin: number;
    periodExtend: number;
  };
  rewardInfos: RewardKeyInfoV6[];
};
export type FormatFarmKeyOut = FormatFarmKeyOutV345 | FormatFarmKeyOutV6;
// item page farm info
// farm info
export interface RewardInfoV345 {
  mint: ApiV3Token;
  type: FarmRewardTypeV6Key;
  apr: number;
  perSecond: number;
}
export interface RewardInfoV6 {
  mint: ApiV3Token;
  type: FarmRewardTypeV6Key;
  apr: number;
  perSecond: number;
  openTime: number;
  endTime: number;
}
export type FarmTagsItem = "Ecosystem" | "Farm" | "Fusion" | "Stake";
export interface FormatFarmInfoOutBase {
  programId: string;
  id: string;
  symbolMints: ApiV3Token[];
  lpMint: ApiV3Token;
  tvl: number;
  lpPrice: number;
  apr: number;
  tags: FarmTagsItem[];
}
export type FormatFarmInfoOutV345 = FormatFarmInfoOutBase & {
  rewardInfos: RewardInfoV345[];
};
export type FormatFarmInfoOutV6 = FormatFarmInfoOutBase & {
  rewardInfos: RewardInfoV6[];
};
export type FormatFarmInfoOut = FormatFarmInfoOutV345 | FormatFarmInfoOutV6;
