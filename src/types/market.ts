import { ExchangeCode, LiveQuoteState } from './api';

/**
 * Visual groups for market instrument categorization.
 */
export type MarketGroup = 'INDEX_OPTIONS' | 'COMMODITIES';

/**
 * Standard supported market instrument identifiers.
 */
export type InstrumentId =
  // Index Options
  | 'NIFTY_50'
  | 'BANK_NIFTY'
  | 'FINNIFTY'
  | 'MIDCPNIFTY'
  | 'SENSEX'
  // Commodities
  | 'GOLD'
  | 'SILVER'
  | 'CRUDE_OIL'
  | 'NATURAL_GAS'
  | 'COPPER'
  | 'ZINC';

/**
 * Backward compatibility alias for existing market categories.
 */
export type MarketCategory = 'NIFTY_50' | 'SENSEX' | 'COMMODITIES';

export type OptionType = 'CE' | 'PE';

/**
 * Detailed specification for an individual tradable instrument.
 */
export interface InstrumentDefinition {
  id: InstrumentId;
  name: string;
  symbol: string;
  exchange: ExchangeCode;
  group: MarketGroup;
  description: string;
  badge: string;
  supportsOptions: boolean;
  defaultLotSize: number | null;
  lotSizeHelperText: string;
  isLotSizeManualRequired: boolean;
  strikeStep?: number;
  unsupportedMessage?: string;
}

export interface MarketPreset {
  id: MarketCategory;
  name: string;
  description: string;
  badge: string;
  exchange: ExchangeCode;
  defaultLotSize: number | null;
  lotSizeHelperText: string;
  isLotSizeManualRequired: boolean;
  strikeStep?: number;
  sampleStrikes?: number[];
  defaultSymbol: string;
}

export interface ContractSpecification {
  marketCategory?: MarketCategory;
  instrumentId?: InstrumentId;
  exchange: ExchangeCode;
  underlyingSymbol: string;
  expiryDate?: string; // Format YYYY-MM-DD
  strikePrice: number | null;
  lotSize: number | null;
  optionType?: OptionType;
  contractIdentifier?: string; // When provided by provider contract master
}

/**
 * Represents a contract selected by the user in the option chain interface.
 */
export interface SelectedContract {
  token?: string;
  exchange: ExchangeCode;
  underlyingSymbol: string;
  expiryDate: string;
  strikePrice: number;
  optionType: OptionType;
  contractIdentifier?: string;
  lotSize?: number | null;
  premium?: number | null;
  priceChange?: number | null;
  priceChangePercent?: number | null;
  bidPrice?: number | null;
  askPrice?: number | null;
  openInterest?: number | null;
  changeInOpenInterest?: number | null;
  volume?: number | null;
  iv?: number | null;
  source?: 'MANUAL' | 'API';
  quoteState?: LiveQuoteState;
  timestamp?: string;
}
