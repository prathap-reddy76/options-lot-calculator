import { describe, expect, it } from 'vitest';
import {
  evaluateQuoteFreshness,
  isContractExpired,
  isQuoteStale,
  validateContractQuery,
  validateProviderQuote,
} from '@/lib/marketDataValidation';
import { MarketDataError } from '../errors';
import { UnconfiguredProviderAdapter, providerRegistry } from '../adapter';
import { ContractLookupQuery } from '@/types/api';

describe('Market Data Architecture & Validation (Phase 2)', () => {
  describe('Contract Lookup Query Validation', () => {
    it('validates a correct contract query', () => {
      const validQuery: ContractLookupQuery = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24500,
        optionType: 'CE',
      };

      const result = validateContractQuery(validQuery);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedQuery).toBeDefined();
      expect(result.sanitizedQuery?.underlyingSymbol).toBe('NIFTY');
      expect(result.sanitizedQuery?.strikePrice).toBe(24500);
      expect(result.sanitizedQuery?.optionType).toBe('CE');
    });

    it('rejects unsupported or invalid exchanges', () => {
      const invalidQuery = {
        exchange: 'NASDAQ',
        underlyingSymbol: 'AAPL',
        expiryDate: '2026-10-29',
        strikePrice: 150,
        optionType: 'CE',
      };

      const result = validateContractQuery(invalidQuery);
      expect(result.isValid).toBe(false);
      expect(result.errors.exchange).toBeDefined();
    });

    it('rejects invalid or non-positive strike prices', () => {
      const invalidZeroStrike = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 0,
        optionType: 'PE',
      };
      const resultZero = validateContractQuery(invalidZeroStrike);
      expect(resultZero.isValid).toBe(false);
      expect(resultZero.errors.strikePrice).toBeDefined();

      const invalidNegativeStrike = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: -24500,
        optionType: 'PE',
      };
      const resultNeg = validateContractQuery(invalidNegativeStrike);
      expect(resultNeg.isValid).toBe(false);
      expect(resultNeg.errors.strikePrice).toBeDefined();
    });

    it('rejects malformed or invalid expiry date strings', () => {
      const invalidFormat = {
        exchange: 'BSE',
        underlyingSymbol: 'SENSEX',
        expiryDate: '29-10-2026', // wrong format (must be YYYY-MM-DD)
        strikePrice: 80000,
        optionType: 'CE',
      };
      const resultFormat = validateContractQuery(invalidFormat);
      expect(resultFormat.isValid).toBe(false);
      expect(resultFormat.errors.expiryDate).toBeDefined();
    });

    it('rejects invalid option types', () => {
      const invalidType = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24500,
        optionType: 'CALL', // Must be 'CE' or 'PE'
      };
      const resultType = validateContractQuery(invalidType);
      expect(resultType.isValid).toBe(false);
      expect(resultType.errors.optionType).toBeDefined();
    });
  });

  describe('Contract Expiration & Staleness Handling', () => {
    it('correctly identifies expired contracts vs active future contracts', () => {
      const pastDate = '2020-01-15';
      const futureDate = '2099-12-31';

      expect(isContractExpired(pastDate)).toBe(true);
      expect(isContractExpired(futureDate)).toBe(false);
    });

    it('detects stale quotes based on threshold', () => {
      const referenceTime = new Date('2026-10-23T15:00:00.000Z');

      // 30 seconds ago (fresh when threshold is 60s)
      const freshTimestamp = '2026-10-23T14:59:30.000Z';
      expect(isQuoteStale(freshTimestamp, 60000, referenceTime)).toBe(false);

      // 3 minutes ago (stale when threshold is 60s)
      const staleTimestamp = '2026-10-23T14:57:00.000Z';
      expect(isQuoteStale(staleTimestamp, 60000, referenceTime)).toBe(true);

      // Missing timestamp is treated as stale/unavailable
      expect(isQuoteStale(undefined, 60000, referenceTime)).toBe(true);
    });

    it('evaluates quote freshness levels', () => {
      const referenceTime = new Date('2026-10-23T15:00:00.000Z');

      expect(evaluateQuoteFreshness(undefined, true, 60000, referenceTime)).toBe('UNAVAILABLE');
      expect(evaluateQuoteFreshness('2026-10-23T14:59:45.000Z', false, 60000, referenceTime)).toBe('MANUAL');
      expect(evaluateQuoteFreshness('2026-10-23T14:59:45.000Z', true, 60000, referenceTime)).toBe('REALTIME');
      expect(evaluateQuoteFreshness('2026-10-23T14:55:00.000Z', true, 60000, referenceTime)).toBe('STALE');
    });
  });

  describe('Provider Response Payload Validation', () => {
    it('validates a properly formed provider quote payload', () => {
      const rawPayload = {
        instrumentIdentifier: 'NSE:NIFTY26OCT24500CE',
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        strikePrice: 24500,
        optionType: 'CE',
        expiryDate: '2026-10-29',
        lotSize: 65,
        lastTradedPrice: 42.5,
        bidPrice: 42.4,
        askPrice: 42.6,
        openInterest: 1250000,
        timestamp: new Date().toISOString(),
        provider: 'Kite',
      };

      const result = validateProviderQuote(rawPayload);
      expect(result.isValid).toBe(true);
      expect(result.quote).toBeDefined();
      expect(result.quote?.lastTradedPrice).toBe(42.5);
      expect(result.quote?.metadata.source).toBe('API');
    });

    it('rejects malformed payloads with negative or non-numeric lastTradedPrice', () => {
      const negativePrice = {
        instrumentIdentifier: 'NSE:NIFTY26OCT24500CE',
        strikePrice: 24500,
        optionType: 'CE',
        lotSize: 65,
        lastTradedPrice: -10, // Invalid negative price
        timestamp: new Date().toISOString(),
      };

      const result = validateProviderQuote(negativePrice);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('MALFORMED_RESPONSE');
    });

    it('rejects invalid or non-integer lot sizes in provider response', () => {
      const invalidLotSize = {
        instrumentIdentifier: 'NSE:NIFTY26OCT24500CE',
        strikePrice: 24500,
        optionType: 'CE',
        lotSize: 0, // Invalid lot size
        lastTradedPrice: 50,
        timestamp: new Date().toISOString(),
      };

      const result = validateProviderQuote(invalidLotSize);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('MALFORMED_RESPONSE');
    });

    it('rejects quotes that do not match requested strike', () => {
      const expectedQuery: ContractLookupQuery = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24500,
        optionType: 'CE',
      };

      const mismatchedPayload = {
        instrumentIdentifier: 'NSE:NIFTY26OCT25000CE',
        strikePrice: 25000, // Mismatched strike!
        optionType: 'CE',
        lotSize: 65,
        lastTradedPrice: 15,
        timestamp: new Date().toISOString(),
      };

      const result = validateProviderQuote(mismatchedPayload, expectedQuery);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('INVALID_STRIKE');
    });
  });

  describe('MarketDataError Hierarchy', () => {
    it('creates structured error details correctly', () => {
      const err = MarketDataError.rateLimitExceeded('TestBroker', 30);
      const detail = err.toDetail();

      expect(detail.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(detail.message).toContain('Rate limit exceeded');
      expect(detail.details?.retryAfterSeconds).toBe(30);
      expect(detail.timestamp).toBeDefined();
    });

    it('creates notConfigured error correctly', () => {
      const err = MarketDataError.notConfigured();
      expect(err.code).toBe('PROVIDER_NOT_CONFIGURED');
    });
  });

  describe('Unconfigured Adapter & Registry Safety', () => {
    it('reports unconfigured status and never performs network calls', async () => {
      const adapter = new UnconfiguredProviderAdapter();
      expect(adapter.isConfigured()).toBe(false);

      const status = await adapter.testConnection();
      expect(status.connected).toBe(false);
      expect(status.configured).toBe(false);
    });

    it('returns structured error when looking up quotes on unconfigured adapter', async () => {
      const adapter = new UnconfiguredProviderAdapter();
      const query: ContractLookupQuery = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2099-12-31',
        strikePrice: 24500,
        optionType: 'CE',
      };

      const result = await adapter.getContractQuote(query);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PROVIDER_NOT_CONFIGURED');
      }
    });

    it('rejects expired contracts before delegating to provider', async () => {
      const adapter = new UnconfiguredProviderAdapter();
      const expiredQuery: ContractLookupQuery = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2020-01-01', // Expired
        strikePrice: 24500,
        optionType: 'CE',
      };

      const result = await adapter.getContractQuote(expiredQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONTRACT_EXPIRED');
      }
    });

    it('registry returns unconfigured adapter by default', () => {
      const adapter = providerRegistry.getAdapter(null);
      expect(adapter.isConfigured()).toBe(false);
      expect(adapter.providerId).toBe('UNCONFIGURED');
    });
  });
});
