import {
  ConnectionStatus,
  ContractLookupQuery,
  IMarketDataService,
  MarketInstrument,
  OptionChainSummary,
  OptionChainTableData,
  ProviderLookupResult,
} from '@/types/api';
import { InstrumentId, MarketCategory } from '@/types/market';
import { getServerMarketDataConfig } from './config';
import { providerRegistry } from './adapter';
import { MarketDataError } from './errors';
import { angelOneAdapter } from './angelOne/adapter';

/**
 * Server-Side Market Data Service.
 *
 * Provides a unified facade connecting the Next.js API route layer
 * to registered provider adapters (e.g. Angel One SmartAPI).
 */
export class MarketDataService implements IMarketDataService {
  isConnected(): boolean {
    const config = getServerMarketDataConfig();
    if (!config.isConfigured) return false;
    const adapter = providerRegistry.getAdapter(config.providerId);
    return adapter.isConfigured();
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const config = getServerMarketDataConfig();
    const adapter = providerRegistry.getAdapter(config.providerId);
    return await adapter.testConnection();
  }

  async getContractQuote(query: ContractLookupQuery): Promise<ProviderLookupResult> {
    const config = getServerMarketDataConfig();
    const adapter = providerRegistry.getAdapter(config.providerId);
    return await adapter.getContractQuote(query);
  }

  async getOptionChainTable(
    instrumentId: InstrumentId,
    expiry?: string
  ): Promise<OptionChainTableData> {
    const config = getServerMarketDataConfig();
    if (config.providerId === 'ANGEL_ONE' && angelOneAdapter.isConfigured()) {
      return await angelOneAdapter.getOptionChain(instrumentId, expiry);
    }
    throw MarketDataError.notConfigured(
      'Live market data provider is not configured. Manual calculation mode is active.'
    );
  }

  async getOptionChain(_symbol: string, _expiry?: string): Promise<OptionChainSummary> {
    throw MarketDataError.notConfigured(
      'Live option chain summary feed is not configured. Use getOptionChainTable.'
    );
  }

  async getInstruments(_category: MarketCategory): Promise<MarketInstrument[]> {
    return [];
  }
}

// Default singleton instance
export const marketDataService = new MarketDataService();

// Export related modules for consumer convenience
export * from './errors';
export * from './config';
export * from './adapter';
export * from './angelOne/adapter';
export * from './angelOne/auth';
export * from './angelOne/instrumentMaster';
export * from './angelOne/totp';
