import { getServerMarketDataConfig } from '@/services/marketData/config';
import {
  angelOneSmartStream,
  getSmartStreamExchangeType,
} from '@/services/marketData/angelOne/smartStream';

export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events (SSE) route for live option market stream.
 * Connects browser clients safely through server-managed Angel One SmartStream WebSocket.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokensParam = searchParams.get('tokens');
  const segment = searchParams.get('segment') || 'NFO';

  const tokens = tokensParam
    ? tokensParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const config = getServerMarketDataConfig();
  if (!config.angelOne.isConfigured) {
    return new Response(
      JSON.stringify({
        error: 'Angel One provider not configured. Live WebSocket streaming is disabled.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const exchangeType = getSmartStreamExchangeType(segment);

  // Subscribe tokens if any specified
  if (tokens.length > 0) {
    angelOneSmartStream.subscribeTokens([{ exchangeType, tokens }]);
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // 1. Initial connection handshake event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: 'connected',
            serverTime: new Date().toISOString(),
            subscribedCount: tokens.length,
          })}\n\n`
        )
      );

      // 2. Deliver currently cached latest ticks for requested tokens immediately
      for (const token of tokens) {
        const cached = angelOneSmartStream.getLatestTick(token);
        if (cached) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(cached)}\n\n`));
        }
      }

      // 3. Register live tick broadcast listener
      const unsubscribeTickListener = angelOneSmartStream.subscribeTicks((tick) => {
        if (tokens.length === 0 || tokens.includes(tick.token)) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(tick)}\n\n`));
          } catch {
            // Stream might have terminated
          }
        }
      });

      // 4. Send keepalive comment ping every 15s to keep proxy/gateway connections active
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          // Closed
        }
      }, 15000);

      // 5. Cleanup on client disconnection
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        unsubscribeTickListener();
        if (tokens.length > 0) {
          angelOneSmartStream.unsubscribeTokens([{ exchangeType, tokens }]);
        }
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
