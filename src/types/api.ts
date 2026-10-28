import { MarketCategory, OptionType } from './market';

/**
 * Standard exchange definitions supported by the architecture.
 */
export type ExchangeCode = 'NSE' | 'BSE' | 'MCX';

/**
 * Origin of the premium used for lot calculations.
 * In Phase 1 and 2, all active calculations use 'MANUAL'.
 */
export type PremiumSource = 'MANUAL' | 'API';

/**
 * Current availability and lifecycle status of a quote.
 */
export type QuoteStatus =
  | 'AVAILABLE'
  | 'MISSING'
  | 'STALE'
  | 'ERROR'
  | 'MANUAL_OVERRIDE';

/**
 * Freshness indicator for market quotes.
 */
export type QuoteFreshness =
  | 'REALTIME'
  | 'DELAYED'
  | 'STALE'
  | 'MANUAL'
  | 'UNAVAILABLE';

/**
 * Explicit states for live quote display in UI.
 */
export type LiveQuoteState =
  | 'NOT_CONNECTED'
  | 'LOADING'
  | 'LIVE'
  | 'DELAYED'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'ERROR';

/**
 * Standard error codes covering all market-data failure modes.
 */
export type MarketDataErrorCode =
  | 'INVALID_INSTRUMENT'
  | 'INVALID_EXPIRY'
  | 'INVALID_STRIKE'
  | 'CONTRACT_EXPIRED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'STALE_QUOTE'
  | 'UNSUPPORTED_INSTRUMENT'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

/**
 * Structured error details for market data operations.
 */
export interface MarketDataErrorDetail {
  code: MarketDataErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

/**
 * Metadata accompanying any contract quote to distinguish between manual and API data.
 */
export interface QuoteMetadata {
  source: PremiumSource;
  status: QuoteStatus;
  freshness: QuoteFreshness;
  provider?: string;
  fetchedAt?: string; // ISO 8601 timestamp when client/server requested
  quoteTimestamp?: string; // ISO 8601 timestamp emitted by provider
  isStale: boolean;
  notes?: string;
}

/**
 * Base market instrument descriptor.
 */
export interface MarketInstrument {
  identifier: string; // e.g. NSE:NIFTY50, BSE:SENSEX, MCX:CRUDEOIL
  name: string;
  category: MarketCategory;
  exchange: ExchangeCode;
  lotSize: number;
  tickSize: number;
}

/**
 * Provider-independent Option Contract Quote model.
 */
export interface OptionContractQuote {
  instrumentIdentifier: string;
  exchange: ExchangeCode;
  underlyingSymbol: string;
  strikePrice: number;
  optionType: OptionType;
  expiryDate: string; // ISO date format YYYY-MM-DD
  lotSize: number;
  lastTradedPrice: number;
  bidPrice?: number;
  askPrice?: number;
  openInterest?: number;
  timestamp: string; // ISO timestamp
  metadata: QuoteMetadata;
}

/**
 * Query parameters required for contract quote lookup.
 */
export interface ContractLookupQuery {
  exchange: ExchangeCode;
  underlyingSymbol: string;
  expiryDate: string; // YYYY-MM-DD
  strikePrice: number;
  optionType: OptionType;
}

/**
 * Legacy lookup query compatibility alias.
 */
export type QuoteLookupRequest = ContractLookupQuery;

/**
 * Discriminated union response for quote lookups.
 */
export type ProviderLookupResult =
  | { success: true; data: OptionContractQuote }
  | { success: false; error: MarketDataErrorDetail };

/**
 * Option chain representation for future chain views.
 */
export interface OptionChainSummary {
  underlying: string;
  exchange: ExchangeCode;
  underlyingPrice: number;
  availableExpiries: string[];
  contracts: OptionContractQuote[];
}

/**
 * Connection diagnostic status.
 */
export interface ConnectionStatus {
  connected: boolean;
  providerId: string;
  message: string;
  configured: boolean;
  latencyMs?: number;
}

/**
 * Provider-independent Adapter Interface for future live market-data connections.
 */
export interface IMarketDataProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;
  isConfigured(): boolean;
  testConnection(): Promise<ConnectionStatus>;
  getContractQuote(query: ContractLookupQuery): Promise<ProviderLookupResult>;
}

/**
 * High-level market data service interface used by the application layer.
 */
export interface IMarketDataService {
  isConnected(): boolean;
  getConnectionStatus(): Promise<ConnectionStatus>;
  getContractQuote(query: ContractLookupQuery): Promise<ProviderLookupResult>;
  getOptionChain?(symbol: string, expiry?: string): Promise<OptionChainSummary>;
  getInstruments?(category: MarketCategory): Promise<MarketInstrument[]>;
}

export interface OptionChainLegDetail {
  token?: string;
  contractIdentifier?: string;
  premium: number | null;
  quoteState: LiveQuoteState;
  priceChange?: number | null;
  priceChangePercent?: number | null;
  bid?: number | null;
  ask?: number | null;
  openInterest?: number | null;
  changeInOpenInterest?: number | null;
  volume?: number | null;
  impliedVolatility?: number | null;
  lotSize?: number | null;
  timestamp?: string;
}

/**
 * Option Chain table row representation for the Groww-style UI selection interface.
 */
export interface OptionChainRow {
  strikePrice: number;
  isAtm?: boolean;
  ce?: OptionChainLegDetail;
  pe?: OptionChainLegDetail;
}

export interface OptionChainTableData {
  underlyingSymbol: string;
  exchange: ExchangeCode;
  expiryDate: string;
  underlyingPrice?: number;
  underlyingChange?: number;
  underlyingChangePercent?: number;
  availableExpiries: string[];
  rows: OptionChainRow[];
  providerName?: string;
  retrievalTimestamp?: string;
  quoteState: LiveQuoteState;
}

