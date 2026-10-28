import {
  ConnectionStatus,
  ContractLookupQuery,
  IMarketDataProviderAdapter,
  ProviderLookupResult,
} from '@/types/api';
import { MarketDataError } from './errors';
import { isContractExpired, validateContractQuery } from '@/lib/marketDataValidation';

/**
 * Base abstract class for any future concrete broker market-data adapter (e.g. Zerodha, Upstox, Dhan).
 * Enforces uniform validation, error handling, and parameter normalization.
 */
export abstract class BaseMarketDataProviderAdapter implements IMarketDataProviderAdapter {
  abstract readonly providerId: string;
  abstract readonly providerName: string;

  abstract isConfigured(): boolean;

  abstract testConnection(): Promise<ConnectionStatus>;

  /**
   * Internal provider-specific lookup implementation to be supplied by concrete adapters in Phase 3.
   */
  protected abstract fetchQuoteFromProvider(
    query: ContractLookupQuery
  ): Promise<ProviderLookupResult>;

  /**
   * Template method wrapping query validation, contract expiration checks, and error catching.
   */
  public async getContractQuote(query: ContractLookupQuery): Promise<ProviderLookupResult> {
    // 1. Validate query structure
    const validation = validateContractQuery(query);
    if (!validation.isValid || !validation.sanitizedQuery) {
      return {
        success: false,
        error: {
          code: 'MALFORMED_RESPONSE',
          message: Object.values(validation.errors).join(' '),
          details: validation.errors,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const sanitized = validation.sanitizedQuery;

    // 2. Check contract expiration
    if (isContractExpired(sanitized.expiryDate)) {
      return {
        success: false,
        error: MarketDataError.expiredContract(sanitized.expiryDate).toDetail(),
      };
    }

    // 3. Check configuration status
    if (!this.isConfigured()) {
      return {
        success: false,
        error: MarketDataError.notConfigured().toDetail(),
      };
    }

    // 4. Delegate to provider implementation with safe error capture
    try {
      return await this.fetchQuoteFromProvider(sanitized);
    } catch (err: unknown) {
      if (err instanceof MarketDataError) {
        return { success: false, error: err.toDetail() };
      }
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Unknown provider error occurred.',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

/**
 * Unconfigured adapter used by default in Phase 1 & 2.
 * Never performs network requests and clearly reports provider unconfigured status.
 */
export class UnconfiguredProviderAdapter extends BaseMarketDataProviderAdapter {
  readonly providerId = 'UNCONFIGURED';
  readonly providerName = 'Unconfigured Provider (Manual Mode)';

  isConfigured(): boolean {
    return false;
  }

  async testConnection(): Promise<ConnectionStatus> {
    return {
      connected: false,
      configured: false,
      providerId: this.providerId,
      message: 'No market data provider is configured. Manual calculation mode is active.',
    };
  }

  protected async fetchQuoteFromProvider(
    _query: ContractLookupQuery
  ): Promise<ProviderLookupResult> {
    return {
      success: false,
      error: MarketDataError.notConfigured().toDetail(),
    };
  }
}

/**
 * Registry for managing provider adapters.
 */
class MarketDataProviderRegistry {
  private adapters = new Map<string, IMarketDataProviderAdapter>();
  private defaultAdapter: IMarketDataProviderAdapter = new UnconfiguredProviderAdapter();

  public register(adapter: IMarketDataProviderAdapter): void {
    this.adapters.set(adapter.providerId.toUpperCase(), adapter);
  }

  public getAdapter(providerId?: string | null): IMarketDataProviderAdapter {
    if (!providerId) {
      return this.defaultAdapter;
    }
    const adapter = this.adapters.get(providerId.toUpperCase());
    return adapter || this.defaultAdapter;
  }

  public listRegisteredProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const providerRegistry = new MarketDataProviderRegistry();
