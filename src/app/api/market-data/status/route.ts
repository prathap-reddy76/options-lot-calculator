import { NextResponse } from 'next/server';
import { getServerMarketDataConfig } from '@/services/marketData/config';
import { marketDataService } from '@/services/marketData';
import { SUPPORTED_EXCHANGES } from '@/lib/marketDataValidation';

/**
 * GET /api/market-data/status
 *
 * Reports server-side market data provider configuration and connection status to the client.
 * Does NOT expose API keys or secrets.
 */
export async function GET() {
  const config = getServerMarketDataConfig();
  const connStatus = await marketDataService.getConnectionStatus();

  return NextResponse.json({
    configured: config.isConfigured,
    connected: connStatus.connected,
    providerId: config.providerId || 'UNCONFIGURED',
    message: connStatus.message,
    supportedExchanges: SUPPORTED_EXCHANGES,
    stalenessThresholdMs: config.stalenessThresholdMs,
    latencyMs: connStatus.latencyMs,
  });
}
