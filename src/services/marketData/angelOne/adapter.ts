import {
  ConnectionStatus,
  ContractLookupQuery,
  OptionChainRow,
  OptionChainTableData,
  OptionContractQuote,
  ProviderLookupResult,
} from '@/types/api';
import { InstrumentId } from '@/types/market';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { BaseMarketDataProviderAdapter, providerRegistry } from '../adapter';
import { getServerMarketDataConfig } from '../config';
import { MarketDataError } from '../errors';
import { angelOneAuth, DEFAULT_SMARTAPI_HEADERS } from './auth';
import {
  angelOneInstrumentMaster,
  mapInstrumentToAngelOne,
  ParsedOptionContract,
} from './instrumentMaster';

export interface SmartApiQuoteItem {
  exchange: string;
  tradingSymbol: string;
  symbolToken: string;
  ltp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  netChange?: number;
  percentChange?: number;
  tradeVolume?: number;
  opnInterest?: number;
  exchangeFeedTime?: string;
  exchangeTradeTime?: string;
  depth?: {
    buy?: Array<{ price: number; quantity: number; orders?: number }>;
    sell?: Array<{ price: number; quantity: number; orders?: number }>;
  };
}

export interface SmartApiQuoteResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data?: {
    fetched?: SmartApiQuoteItem[];
    unfetched?: string[];
  };
}

/**
 * Angel One SmartAPI Concrete Provider Adapter.
 */
export class AngelOneMarketDataAdapter extends BaseMarketDataProviderAdapter {
  readonly providerId = 'ANGEL_ONE';
  readonly providerName = 'Angel One SmartAPI';

  // Short-lived in-memory quote cache (5 seconds) to prevent redundant API hits & rate limiting
  private quoteCache = new Map<string, { quote: SmartApiQuoteItem; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5000;

  public isConfigured(): boolean {
    const config = getServerMarketDataConfig();
    return config.angelOne.isConfigured;
  }

  public async testConnection(): Promise<ConnectionStatus> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        configured: false,
        providerId: this.providerId,
        message:
          'Angel One credentials not configured. Please supply API Key, Client Code, PIN, and TOTP Secret.',
      };
    }

    const start = Date.now();
    try {
      // Verifies authentication and session generation
      await angelOneAuth.getSession();
      const latencyMs = Date.now() - start;

      return {
        connected: true,
        configured: true,
        providerId: this.providerId,
        message: 'Connected to Angel One SmartAPI successfully.',
        latencyMs,
      };
    } catch (err: unknown) {
      return {
        connected: false,
        configured: true,
        providerId: this.providerId,
        message: err instanceof Error ? err.message : 'Angel One authentication test failed.',
      };
    }
  }

  /**
   * Fetches quote for a single option contract.
   */
  protected async fetchQuoteFromProvider(
    query: ContractLookupQuery
  ): Promise<ProviderLookupResult> {
    // 1. Find InstrumentId matching query
    const instrumentId = this.resolveInstrumentId(query.underlyingSymbol, query.exchange);
    if (!instrumentId) {
      return {
        success: false,
        error: MarketDataError.unsupportedInstrument(query.underlyingSymbol).toDetail(),
      };
    }

    // 2. Find contract token from instrument master
    const contract = await angelOneInstrumentMaster.findContract(
      instrumentId,
      query.expiryDate,
      query.strikePrice,
      query.optionType
    );

    if (!contract) {
      return {
        success: false,
        error: {
          code: 'INVALID_INSTRUMENT',
          message: `No active contract found in instrument master for ${query.underlyingSymbol} ${query.strikePrice} ${query.optionType} expiring on ${query.expiryDate}.`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 3. Fetch quote data
    const quoteMap = await this.fetchQuotesBatch(contract.exchangeSegment, [contract.token]);
    const quoteItem = quoteMap.get(contract.token);

    if (!quoteItem) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: `Market quote unavailable from Angel One for token ${contract.token} (${contract.symbol}).`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const bestBid = quoteItem.depth?.buy?.[0]?.price;
    const bestAsk = quoteItem.depth?.sell?.[0]?.price;
    const nowIso = new Date().toISOString();

    const quote: OptionContractQuote = {
      instrumentIdentifier: `${contract.exchangeSegment}:${contract.symbol}`,
      exchange: query.exchange,
      underlyingSymbol: query.underlyingSymbol,
      strikePrice: contract.strikePrice,
      optionType: contract.optionType,
      expiryDate: contract.expiryDate,
      lotSize: contract.lotSize,
      lastTradedPrice: quoteItem.ltp,
      bidPrice: bestBid,
      askPrice: bestAsk,
      openInterest: quoteItem.opnInterest,
      timestamp: quoteItem.exchangeFeedTime || nowIso,
      metadata: {
        source: 'API',
        status: 'AVAILABLE',
        freshness: 'REALTIME',
        provider: this.providerName,
        fetchedAt: nowIso,
        quoteTimestamp: quoteItem.exchangeFeedTime || nowIso,
        isStale: false,
      },
    };

    return { success: true, data: quote };
  }

  /**
   * Fetches the full option chain table data for an underlying and expiry.
   */
  public async getOptionChain(
    instrumentId: InstrumentId,
    expiryDate?: string
  ): Promise<OptionChainTableData> {
    if (!this.isConfigured()) {
      throw MarketDataError.notConfigured();
    }

    const mapping = mapInstrumentToAngelOne(instrumentId);
    if (!mapping) {
      throw MarketDataError.unsupportedInstrument(instrumentId);
    }

    const def = INSTRUMENTS_DEFINITIONS[instrumentId];

    // 1. Get available expiries
    const availableExpiries = await angelOneInstrumentMaster.getAvailableExpiries(instrumentId);
    if (availableExpiries.length === 0) {
      throw new MarketDataError(
        'INVALID_EXPIRY',
        `No available derivative contracts found for ${def.name}.`
      );
    }

    const activeExpiry = expiryDate && availableExpiries.includes(expiryDate)
      ? expiryDate
      : availableExpiries[0];

    // 2. Get contracts grouped by strike
    const strikeMap = await angelOneInstrumentMaster.getContractsForExpiry(instrumentId, activeExpiry);
    const sortedStrikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);

    // Collect all tokens to fetch in batch
    const tokensToFetch: string[] = [];
    for (const strike of sortedStrikes) {
      const pair = strikeMap.get(strike);
      if (pair?.ce?.token) tokensToFetch.push(pair.ce.token);
      if (pair?.pe?.token) tokensToFetch.push(pair.pe.token);
    }

    // 3. Batch fetch quotes
    const quoteMap = await this.fetchQuotesBatch(mapping.exchangeSegment, tokensToFetch);

    // Approximate ATM: find strike closest to first valid LTP or center strike
    const midIndex = Math.floor(sortedStrikes.length / 2);
    const atmStrike = sortedStrikes[midIndex] || 0;

    const rows: OptionChainRow[] = sortedStrikes.map((strike) => {
      const pair = strikeMap.get(strike);
      const ceContract = pair?.ce;
      const peContract = pair?.pe;

      const ceQuote = ceContract ? quoteMap.get(ceContract.token) : undefined;
      const peQuote = peContract ? quoteMap.get(peContract.token) : undefined;

      const isAtm = strike === atmStrike;

      return {
        strikePrice: strike,
        isAtm,
        ce: ceContract
          ? {
              token: ceContract.token,
              contractIdentifier: `${ceContract.exchangeSegment}:${ceContract.symbol}`,
              premium: ceQuote?.ltp ?? null,
              quoteState: ceQuote ? 'LIVE' : 'UNAVAILABLE',
              priceChange: ceQuote?.netChange ?? null,
              priceChangePercent: ceQuote?.percentChange ?? null,
              bid: ceQuote?.depth?.buy?.[0]?.price ?? null,
              ask: ceQuote?.depth?.sell?.[0]?.price ?? null,
              openInterest: ceQuote?.opnInterest ?? null,
              volume: ceQuote?.tradeVolume ?? null,
              lotSize: ceContract.lotSize,
              timestamp: ceQuote?.exchangeFeedTime,
            }
          : undefined,
        pe: peContract
          ? {
              token: peContract.token,
              contractIdentifier: `${peContract.exchangeSegment}:${peContract.symbol}`,
              premium: peQuote?.ltp ?? null,
              quoteState: peQuote ? 'LIVE' : 'UNAVAILABLE',
              priceChange: peQuote?.netChange ?? null,
              priceChangePercent: peQuote?.percentChange ?? null,
              bid: peQuote?.depth?.buy?.[0]?.price ?? null,
              ask: peQuote?.depth?.sell?.[0]?.price ?? null,
              openInterest: peQuote?.opnInterest ?? null,
              volume: peQuote?.tradeVolume ?? null,
              lotSize: peContract.lotSize,
              timestamp: peQuote?.exchangeFeedTime,
            }
          : undefined,
      };
    });

    return {
      underlyingSymbol: def.symbol,
      exchange: mapping.exchange,
      expiryDate: activeExpiry,
      availableExpiries,
      rows,
      providerName: this.providerName,
      retrievalTimestamp: new Date().toISOString(),
      quoteState: 'LIVE',
    };
  }

  /**
   * Fetches quotes in batches of 50 per request to comply with SmartAPI request limits.
   */
  public async fetchQuotesBatch(
    exchangeSegment: string,
    tokens: string[]
  ): Promise<Map<string, SmartApiQuoteItem>> {
    const results = new Map<string, SmartApiQuoteItem>();
    if (tokens.length === 0) return results;

    const now = Date.now();
    const neededTokens: string[] = [];

    // Check in-memory cache first
    for (const t of tokens) {
      const cached = this.quoteCache.get(t);
      if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
        results.set(t, cached.quote);
      } else {
        neededTokens.push(t);
      }
    }

    if (neededTokens.length === 0) {
      return results;
    }

    const session = await angelOneAuth.getSession();
    const config = getServerMarketDataConfig();
    const ao = config.angelOne;

    const url = `${ao.baseUrl}/rest/secure/angelbroking/market/v1/quote/`;
    const headers = {
      ...DEFAULT_SMARTAPI_HEADERS,
      Authorization: `Bearer ${session.jwtToken}`,
      'X-PrivateKey': ao.apiKey!,
    };

    // Partition into chunks of max 50 tokens
    const CHUNK_SIZE = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < neededTokens.length; i += CHUNK_SIZE) {
      chunks.push(neededTokens.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const body = {
        mode: 'FULL',
        exchangeTokens: {
          [exchangeSegment]: chunk,
        },
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        if (!response.ok) {
          continue;
        }

        const data: SmartApiQuoteResponse = await response.json();
        if (data.status && data.data?.fetched) {
          for (const item of data.data.fetched) {
            results.set(item.symbolToken, item);
            this.quoteCache.set(item.symbolToken, { quote: item, timestamp: now });
          }
        }
      } catch {
        // Fall back gracefully; items not found in results will be reported as UNAVAILABLE
      }
    }

    return results;
  }

  private resolveInstrumentId(underlyingSymbol: string, exchange: string): InstrumentId | null {
    const sym = underlyingSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (sym === 'NIFTY') return 'NIFTY_50';
    if (sym === 'BANKNIFTY') return 'BANK_NIFTY';
    if (sym === 'FINNIFTY') return 'FINNIFTY';
    if (sym === 'MIDCPNIFTY') return 'MIDCPNIFTY';
    if (sym === 'SENSEX') return 'SENSEX';
    if (sym === 'GOLD') return 'GOLD';
    if (sym === 'SILVER') return 'SILVER';
    if (sym === 'CRUDEOIL') return 'CRUDE_OIL';
    if (sym === 'NATURALGAS') return 'NATURAL_GAS';
    if (sym === 'COPPER') return 'COPPER';
    return null;
  }
}

export const angelOneAdapter = new AngelOneMarketDataAdapter();

// Register into provider registry
providerRegistry.register(angelOneAdapter);
