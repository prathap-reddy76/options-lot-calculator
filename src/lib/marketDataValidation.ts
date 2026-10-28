import {
  ContractLookupQuery,
  ExchangeCode,
  MarketDataErrorDetail,
  OptionContractQuote,
  QuoteFreshness,
} from '@/types/api';
import { OptionType } from '@/types/market';

/**
 * Supported exchanges in the Indian financial market ecosystem.
 */
export const SUPPORTED_EXCHANGES: ExchangeCode[] = ['NSE', 'BSE', 'MCX'];

/**
 * Standard underlying instruments supported across exchanges.
 */
export const KNOWN_UNDERLYINGS: Record<ExchangeCode, string[]> = {
  NSE: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'],
  BSE: ['SENSEX', 'BANKEX'],
  MCX: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER'],
};

/**
 * Validates a contract lookup request parameters before transmission.
 */
export function validateContractQuery(query: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedQuery?: ContractLookupQuery;
} {
  const errors: Record<string, string> = {};

  if (!query || typeof query !== 'object') {
    return { isValid: false, errors: { general: 'Query must be a valid object.' } };
  }

  const q = query as Partial<ContractLookupQuery>;

  // Validate Exchange
  if (!q.exchange || !SUPPORTED_EXCHANGES.includes(q.exchange)) {
    errors.exchange = `Exchange must be one of: ${SUPPORTED_EXCHANGES.join(', ')}`;
  }

  // Validate Underlying Symbol
  if (!q.underlyingSymbol || typeof q.underlyingSymbol !== 'string' || q.underlyingSymbol.trim() === '') {
    errors.underlyingSymbol = 'Underlying symbol is required (e.g. NIFTY, SENSEX, CRUDEOIL).';
  }

  // Validate Option Type
  const validOptionTypes: OptionType[] = ['CE', 'PE'];
  if (!q.optionType || !validOptionTypes.includes(q.optionType)) {
    errors.optionType = 'Option type must be either "CE" or "PE".';
  }

  // Validate Strike Price
  if (q.strikePrice === undefined || q.strikePrice === null || typeof q.strikePrice !== 'number' || isNaN(q.strikePrice) || q.strikePrice <= 0) {
    errors.strikePrice = 'Strike price must be a valid positive number.';
  }

  // Validate Expiry Date (YYYY-MM-DD format)
  if (!q.expiryDate || typeof q.expiryDate !== 'string') {
    errors.expiryDate = 'Expiry date is required in YYYY-MM-DD format.';
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(q.expiryDate)) {
      errors.expiryDate = 'Expiry date must follow the YYYY-MM-DD format.';
    } else {
      const parsedDate = new Date(`${q.expiryDate}T23:59:59Z`);
      if (isNaN(parsedDate.getTime())) {
        errors.expiryDate = 'Expiry date is not a valid calendar date.';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    sanitizedQuery: {
      exchange: q.exchange as ExchangeCode,
      underlyingSymbol: (q.underlyingSymbol as string).trim().toUpperCase(),
      expiryDate: q.expiryDate as string,
      strikePrice: Number(q.strikePrice),
      optionType: q.optionType as OptionType,
    },
  };
}

/**
 * Checks whether an expiry date has already passed.
 */
export function isContractExpired(expiryDateStr: string, referenceDate: Date = new Date()): boolean {
  try {
    const expiry = new Date(`${expiryDateStr}T23:59:59`);
    return expiry.getTime() < referenceDate.getTime();
  } catch {
    return false;
  }
}

/**
 * Checks if a given timestamp represents a stale quote.
 * @param quoteTimestamp ISO 8601 string or Date from quote
 * @param maxAgeMs Maximum age in milliseconds (defaults to 60,000ms / 1 min)
 * @param referenceTime Optional reference date for deterministic testing
 */
export function isQuoteStale(
  quoteTimestamp: string | Date | undefined,
  maxAgeMs: number = 60000,
  referenceTime: Date = new Date()
): boolean {
  if (!quoteTimestamp) return true;
  const quoteTime = typeof quoteTimestamp === 'string' ? new Date(quoteTimestamp).getTime() : quoteTimestamp.getTime();
  if (isNaN(quoteTime)) return true;
  return referenceTime.getTime() - quoteTime > maxAgeMs;
}

/**
 * Evaluates the freshness status of a quote.
 */
export function evaluateQuoteFreshness(
  quoteTimestamp: string | undefined,
  isLiveConnection: boolean,
  stalenessThresholdMs: number = 60000,
  referenceTime: Date = new Date()
): QuoteFreshness {
  if (!quoteTimestamp) return 'UNAVAILABLE';
  if (!isLiveConnection) return 'MANUAL';
  return isQuoteStale(quoteTimestamp, stalenessThresholdMs, referenceTime) ? 'STALE' : 'REALTIME';
}

/**
 * Validates the schema and values of a raw quote returned by an external API provider.
 * Protects against malformed responses, negative prices, NaN, and missing fields.
 */
export function validateProviderQuote(
  raw: unknown,
  expectedQuery?: ContractLookupQuery
): {
  isValid: boolean;
  quote?: OptionContractQuote;
  error?: MarketDataErrorDetail;
} {
  const now = new Date().toISOString();

  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: 'Provider returned a null or non-object response payload.',
        timestamp: now,
      },
    };
  }

  const r = raw as Record<string, unknown>;

  // Check instrument identifier
  if (typeof r.instrumentIdentifier !== 'string' || r.instrumentIdentifier.trim() === '') {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: 'Missing or invalid "instrumentIdentifier" in provider response.',
        timestamp: now,
      },
    };
  }

  // Check lastTradedPrice (must be a non-negative finite number)
  if (
    typeof r.lastTradedPrice !== 'number' ||
    isNaN(r.lastTradedPrice) ||
    !isFinite(r.lastTradedPrice) ||
    r.lastTradedPrice < 0
  ) {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: `Invalid "lastTradedPrice" received: ${String(r.lastTradedPrice)}. Price must be a non-negative finite number.`,
        timestamp: now,
      },
    };
  }

  // Check lotSize (must be a positive integer)
  if (
    typeof r.lotSize !== 'number' ||
    isNaN(r.lotSize) ||
    !Number.isInteger(r.lotSize) ||
    r.lotSize <= 0
  ) {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: `Invalid "lotSize" received: ${String(r.lotSize)}. Lot size must be a positive integer.`,
        timestamp: now,
      },
    };
  }

  // Check strikePrice
  if (
    typeof r.strikePrice !== 'number' ||
    isNaN(r.strikePrice) ||
    r.strikePrice <= 0
  ) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_STRIKE',
        message: `Invalid "strikePrice" received: ${String(r.strikePrice)}. Strike price must be positive.`,
        timestamp: now,
      },
    };
  }

  // Check optionType
  if (r.optionType !== 'CE' && r.optionType !== 'PE') {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: `Invalid "optionType" received: ${String(r.optionType)}. Expected "CE" or "PE".`,
        timestamp: now,
      },
    };
  }

  // Check timestamp
  if (typeof r.timestamp !== 'string' || isNaN(new Date(r.timestamp).getTime())) {
    return {
      isValid: false,
      error: {
        code: 'MALFORMED_RESPONSE',
        message: 'Provider quote timestamp is missing or not a valid ISO 8601 date string.',
        timestamp: now,
      },
    };
  }

  // Verify alignment with requested query if provided
  if (expectedQuery) {
    if (r.strikePrice !== expectedQuery.strikePrice) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_STRIKE',
          message: `Quote strike (${r.strikePrice}) does not match requested strike (${expectedQuery.strikePrice}).`,
          timestamp: now,
        },
      };
    }
    if (r.optionType !== expectedQuery.optionType) {
      return {
        isValid: false,
        error: {
          code: 'MALFORMED_RESPONSE',
          message: `Quote optionType (${r.optionType}) does not match requested optionType (${expectedQuery.optionType}).`,
          timestamp: now,
        },
      };
    }
  }

  const isStale = isQuoteStale(r.timestamp as string);

  const quote: OptionContractQuote = {
    instrumentIdentifier: r.instrumentIdentifier,
    exchange: (r.exchange as ExchangeCode) || expectedQuery?.exchange || 'NSE',
    underlyingSymbol: (r.underlyingSymbol as string) || expectedQuery?.underlyingSymbol || 'NIFTY',
    strikePrice: r.strikePrice,
    optionType: r.optionType as OptionType,
    expiryDate: (r.expiryDate as string) || expectedQuery?.expiryDate || '',
    lotSize: r.lotSize,
    lastTradedPrice: r.lastTradedPrice,
    bidPrice: typeof r.bidPrice === 'number' ? r.bidPrice : undefined,
    askPrice: typeof r.askPrice === 'number' ? r.askPrice : undefined,
    openInterest: typeof r.openInterest === 'number' ? r.openInterest : undefined,
    timestamp: r.timestamp,
    metadata: {
      source: 'API',
      status: isStale ? 'STALE' : 'AVAILABLE',
      freshness: isStale ? 'STALE' : 'REALTIME',
      provider: typeof r.provider === 'string' ? r.provider : undefined,
      fetchedAt: now,
      quoteTimestamp: r.timestamp,
      isStale,
    },
  };

  return { isValid: true, quote };
}
