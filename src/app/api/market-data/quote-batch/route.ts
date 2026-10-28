import { NextRequest, NextResponse } from 'next/server';
import { getServerMarketDataConfig } from '@/services/marketData/config';
import { angelOneAdapter } from '@/services/marketData/angelOne/adapter';

/**
 * POST /api/market-data/quote-batch
 *
 * Secure server-side batch quote endpoint.
 * Fetches real quotes for up to 50 tokens without exposing Angel One JWT or private keys.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exchangeSegment, tokens } = body;

    if (!exchangeSegment || typeof exchangeSegment !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MALFORMED_RESPONSE',
            message: 'Parameter "exchangeSegment" (e.g. NFO, BFO, MCX) is required.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MALFORMED_RESPONSE',
            message: 'Parameter "tokens" must be a non-empty array of instrument tokens.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Limit batch size to SmartAPI maximum (50 tokens)
    const validTokens = tokens.slice(0, 50).map(String);

    const config = getServerMarketDataConfig();
    if (!config.isConfigured || config.providerId !== 'ANGEL_ONE' || !angelOneAdapter.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROVIDER_NOT_CONFIGURED',
            message: 'Angel One SmartAPI is not configured. Manual mode active.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    const quotesMap = await angelOneAdapter.fetchQuotesBatch(exchangeSegment, validTokens);

    // Convert Map to plain object for JSON serialization
    const data: Record<string, unknown> = {};
    quotesMap.forEach((item, token) => {
      data[token] = {
        token: item.symbolToken,
        symbol: item.tradingSymbol,
        ltp: item.ltp,
        priceChange: item.netChange,
        priceChangePercent: item.percentChange,
        volume: item.tradeVolume,
        openInterest: item.opnInterest,
        bid: item.depth?.buy?.[0]?.price,
        ask: item.depth?.sell?.[0]?.price,
        timestamp: item.exchangeFeedTime || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      count: Object.keys(data).length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Batch quote request failed.',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
