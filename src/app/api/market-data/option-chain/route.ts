import { NextRequest, NextResponse } from 'next/server';
import { getServerMarketDataConfig } from '@/services/marketData/config';
import { marketDataService, MarketDataError } from '@/services/marketData';
import { InstrumentId } from '@/types/market';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';

function resolveInstrumentId(param: string | null): InstrumentId | null {
  if (!param) return null;
  const upper = param.trim().toUpperCase().replace(/[\s-]/g, '_');

  // Direct InstrumentId match
  if (upper in INSTRUMENTS_DEFINITIONS) {
    return upper as InstrumentId;
  }

  // Symbol match
  for (const [id, def] of Object.entries(INSTRUMENTS_DEFINITIONS)) {
    if (def.symbol.toUpperCase() === upper || def.name.toUpperCase() === upper) {
      return id as InstrumentId;
    }
  }

  if (upper === 'NIFTY') return 'NIFTY_50';
  if (upper === 'BANKNIFTY') return 'BANK_NIFTY';
  if (upper === 'CRUDEOIL') return 'CRUDE_OIL';
  if (upper === 'NATURALGAS') return 'NATURAL_GAS';

  return null;
}

/**
 * GET /api/market-data/option-chain?instrumentId=NIFTY_50&expiry=2026-10-29
 *
 * Server-side endpoint to query real option chain data from Angel One SmartAPI.
 * If provider is unconfigured, returns 503 PROVIDER_NOT_CONFIGURED.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instrumentParam = searchParams.get('instrumentId') || searchParams.get('symbol');
  const expiry = searchParams.get('expiry')?.trim();

  const instrumentId = resolveInstrumentId(instrumentParam);

  if (!instrumentId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_INSTRUMENT',
          message: `Parameter "instrumentId" or "symbol" is invalid or missing. Received: "${instrumentParam}".`,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    );
  }

  const config = getServerMarketDataConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROVIDER_NOT_CONFIGURED',
          message:
            'Angel One SmartAPI is not configured on the server. Please supply ANGEL_ONE credentials in .env.local.',
          timestamp: new Date().toISOString(),
        },
        data: null,
      },
      { status: 503 }
    );
  }

  try {
    const tableData = await marketDataService.getOptionChainTable(instrumentId, expiry);
    return NextResponse.json(
      {
        success: true,
        data: tableData,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof MarketDataError) {
      const statusCode =
        err.code === 'PROVIDER_NOT_CONFIGURED'
          ? 503
          : err.code === 'INVALID_EXPIRY' || err.code === 'UNSUPPORTED_INSTRUMENT'
          ? 400
          : err.code === 'AUTHENTICATION_FAILED'
          ? 401
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: err.toDetail(),
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to retrieve option chain.',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
