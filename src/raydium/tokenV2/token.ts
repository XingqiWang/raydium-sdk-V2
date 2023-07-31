import { PublicKey } from "@solana/web3.js";
import { MintLayout, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

import { Price, Token, TokenAmount, Fraction } from "../../module";
import { PublicKeyish, validateAndParsePublicKey, SOLMint } from "../../common/pubKey";
import { BigNumberish, parseNumberInfo, toBN } from "../../common/bignumber";
import ModuleBase, { ModuleBaseProps } from "../moduleBase";
import { LoadParams } from "../type";

import { TokenInfo } from "./type";
import { parseTokenPrice } from "./utils";
import { SOL_INFO } from "./constant";
import BN from "bn.js";

export interface MintToTokenAmount {
  token?: Token;
  mint: PublicKeyish;
  amount: BigNumberish;
  decimalDone?: boolean;
}

export default class TokenModule extends ModuleBase {
  private _tokenList: TokenInfo[] = [];
  private _tokenMap: Map<string, TokenInfo> = new Map();
  private _blackTokenMap: Map<string, TokenInfo> = new Map();
  private _tokenPrice: Map<string, Price> = new Map();
  private _mintGroup: { official: Set<string>; jup: Set<string>; extra: Set<string> } = {
    official: new Set(),
    jup: new Set(),
    extra: new Set(),
  };
  private _extraTokenList: TokenInfo[] = [];

  constructor(params: ModuleBaseProps) {
    super(params);
  }

  public async load(params?: LoadParams): Promise<void> {
    this.checkDisabled();
    const { mintList, jup, blacklist } = await this.scope.fetchV3TokenList(params?.forceUpdate);
    // reset all data
    this._tokenList = [];
    this._tokenMap = new Map();
    this._blackTokenMap = new Map();
    this._mintGroup = { official: new Set(), jup: new Set(), extra: new Set() };

    this._tokenMap.set(SOL_INFO.address, SOL_INFO);
    this._mintGroup.official.add(SOL_INFO.address);
    blacklist.forEach((token) => {
      this._blackTokenMap.set(token.address, { ...token, priority: -1 });
    });

    mintList.forEach((token) => {
      if (this._blackTokenMap.has(token.address)) return;
      this._tokenMap.set(token.address, { ...token, type: "raydium", priority: 2 });
      this._mintGroup.official.add(token.address);
    });

    jup.forEach((token) => {
      if (this._blackTokenMap.has(token.address) || this._tokenMap.has(token.address)) return;
      this._tokenMap.set(token.address, { ...token, type: "jupiter", priority: 1 });
      this._mintGroup.jup.add(token.address);
    });

    this._extraTokenList.forEach((token) => {
      if (this._blackTokenMap.has(token.address) || this._tokenMap.has(token.address)) return;
      this._tokenMap.set(token.address, { ...token, type: "extra", priority: 1 });
      this._mintGroup.extra.add(token.address);
    });

    this._tokenList = Array.from(this._tokenMap).map((data) => data[1]);
  }

  get tokenList(): TokenInfo[] {
    return this._tokenList;
  }
  get tokenMap(): Map<string, TokenInfo> {
    return this._tokenMap;
  }
  get blackTokenMap(): Map<string, TokenInfo> {
    return this._blackTokenMap;
  }
  get mintGroup(): { official: Set<string>; jup: Set<string> } {
    return this._mintGroup;
  }

  get tokenPriceMap(): Map<string, Price> {
    return this._tokenPrice;
  }

  public async fetchTokenPrices(preloadRaydiumPrice?: Record<string, number>): Promise<Map<string, Price>> {
    this._tokenPrice = new Map();
    const coingeckoTokens = this._tokenList.filter(
      (token) => !!token.extensions?.coingeckoId && token.address !== PublicKey.default.toBase58(),
    );
    const coingeckoIds = coingeckoTokens.map((token) => token.extensions.coingeckoId!);
    const coingeckoPriceRes = await this.scope.api.getCoingeckoPrice(coingeckoIds);

    const coingeckoPrices: { [key: string]: Price } = coingeckoTokens.reduce(
      (acc, token) =>
        coingeckoPriceRes[token.extensions.coingeckoId!]?.usd
          ? {
              ...acc,
              [token.address]: parseTokenPrice({
                token: this._tokenMap.get(token.address)!,
                numberPrice: coingeckoPriceRes[token.extensions.coingeckoId!].usd!,
                decimalDone: true,
              }),
            }
          : acc,
      {},
    );

    const raydiumPriceRes = preloadRaydiumPrice || (await this.scope.api.getRaydiumTokenPrice());
    const raydiumPrices: { [key: string]: Price } = Object.keys(raydiumPriceRes).reduce(
      (acc, key) =>
        this._tokenMap.get(key)
          ? {
              ...acc,
              [key]: parseTokenPrice({
                token: this._tokenMap.get(key)!,
                numberPrice: raydiumPriceRes[key],
                decimalDone: true,
              }),
            }
          : acc,
      {},
    );
    this._tokenPrice = new Map([...Object.entries(coingeckoPrices), ...Object.entries(raydiumPrices)]);
    return this._tokenPrice;
  }

  /** === util functions === */

  public async getChainTokenInfo(mint: PublicKeyish): Promise<{ token: Token; tokenInfo: TokenInfo }> {
    const _mint = validateAndParsePublicKey({ publicKey: mint });
    const mintStr = _mint.toBase58();
    const mintSymbol = _mint.toString().substring(0, 6);
    const isSol = _mint.equals(SOLMint);

    if (isSol) {
      return {
        token: new Token({
          decimals: SOL_INFO.decimals,
          name: SOL_INFO.name,
          symbol: SOL_INFO.symbol,
          skipMint: true,
          mint: "",
        }),
        tokenInfo: SOL_INFO,
      };
    }

    const tokenInfo = await this.scope.api.getTokenInfo(_mint);
    if (tokenInfo) {
      this._mintGroup.extra.add(mintStr);
      const fullInfo = { ...tokenInfo, priority: 2 };
      this._tokenMap.set(mintStr, fullInfo);
      return {
        token: new Token({
          mint: _mint,
          decimals: tokenInfo.decimals,
          symbol: tokenInfo.symbol || mintSymbol,
          name: tokenInfo.name || mintSymbol,
          isToken2022: tokenInfo.programId === TOKEN_2022_PROGRAM_ID.toBase58(),
        }),
        tokenInfo: fullInfo,
      };
    }

    const info = await this.scope.connection.getAccountInfo(_mint);
    if (!info) this.logAndCreateError("On chain token not found, mint:", _mint.toBase58());

    const data = MintLayout.decode(info!.data);

    const fullInfo = {
      chainId: 101,
      address: mintStr,
      programId: info!.owner.toBase58(),
      logoURI: "",
      symbol: mintSymbol,
      name: mintSymbol,
      decimals: data.decimals,
      tags: [],
      extensions: {},
      priority: 0,
    };

    if (!this._tokenMap.has(mintStr)) {
      this._mintGroup.extra.add(mintStr);
      this._tokenMap.set(mintStr, fullInfo);
    }

    return {
      token: new Token({
        mint: _mint,
        decimals: data.decimals,
        symbol: mintSymbol,
        name: mintSymbol,
        isToken2022: info!.owner.equals(TOKEN_2022_PROGRAM_ID),
      }),
      tokenInfo: fullInfo,
    };
  }

  public mintToToken(mint: PublicKeyish): Token {
    const _mint = validateAndParsePublicKey({ publicKey: mint });
    const tokenInfo = this._tokenMap.get(_mint.toBase58());
    if (!tokenInfo)
      this.logAndCreateError("token not found, mint:", _mint.toBase58(), ", use getChainTokenInfo to get info instead");
    const { decimals, name, symbol } = tokenInfo!;
    const isSol = _mint.equals(SOLMint);
    return new Token({
      decimals,
      name,
      symbol,
      skipMint: isSol,
      mint: isSol ? "" : mint,
      isToken2022: tokenInfo!.programId === TOKEN_2022_PROGRAM_ID.toBase58(),
    });
  }

  public mintToTokenAmount({ mint, amount, decimalDone, token }: MintToTokenAmount): TokenAmount {
    const _token = token || this.mintToToken(mint);

    if (decimalDone) {
      const numberDetails = parseNumberInfo(amount);
      const amountBigNumber = toBN(new Fraction(numberDetails.numerator, numberDetails.denominator));
      return new TokenAmount(_token, amountBigNumber);
    }
    return new TokenAmount(_token, this.decimalAmount({ mint, amount, decimalDone }));
  }

  public decimalAmount({ mint, amount, token }: MintToTokenAmount): BN {
    const numberDetails = parseNumberInfo(amount);
    const _token = token || this.mintToToken(mint);
    return toBN(new Fraction(numberDetails.numerator, numberDetails.denominator).mul(new BN(10 ** _token.decimals)));
  }

  public uiAmount({ mint, amount, token }: MintToTokenAmount): string {
    const numberDetails = parseNumberInfo(amount);
    const _token = token || this.mintToToken(mint);
    if (!_token) return "";
    return new Fraction(numberDetails.numerator, numberDetails.denominator)
      .div(new BN(10 ** _token.decimals))
      .toSignificant(_token.decimals);
  }
}