import { NextRequest, NextResponse } from 'next/server';
import { validateContractQuery } from '@/lib/marketDataValidation';
import { marketDataService } from '@/services/marketData';

/**
 * POST /api/market-data/quote
 *
 * Server-side integration boundary for option contract quote lookups.
 *
 * PHASE 2 BEHAVIOR:
 * 1. Validates requested contract parameters (exchange, symbol, strike, expiry, optionType).
 * 2. If invalid, returns HTTP 400 with structured validation errors.
 * 3. In Phase 2 (without a live provider configured), returns HTTP 503 with code `PROVIDER_NOT_CONFIGURED`.
 * 4. Strictly NEVER fabricates live prices or timestamps.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Server-side validation
    const validation = validateContractQuery(body);
    if (!validation.isValid || !validation.sanitizedQuery) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MALFORMED_RESPONSE',
            message: 'Invalid contract lookup request parameters.',
            details: validation.errors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // 2. Query market data service
    const result = await marketDataService.getContractQuote(validation.sanitizedQuery);

    if (!result.success) {
      const statusCode =
        result.error.code === 'PROVIDER_NOT_CONFIGURED' ? 503 : 400;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error while processing quote.',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
