import WebSocket from 'ws';
import { getServerMarketDataConfig } from '../config';
import { angelOneAuth } from './auth';

export interface SmartStreamTick {
  subscriptionMode: number; // 1 = LTP, 2 = Quote
  exchangeType: number; // 1 = nse_cm, 2 = nse_fo, 3 = bse_cm, 4 = bse_fo, 5 = mcx_fo
  token: string;
  sequenceNumber: number;
  exchangeTimestamp: number; // epoch ms
  ltp: number; // In Rupees
  lastTradedQty?: number;
  avgTradedPrice?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  receivedAt: string; // ISO string
}

export type TickListener = (tick: SmartStreamTick) => void;

/**
 * Exchange type constants for Angel One SmartStream
 */
export const SMART_STREAM_EXCHANGE_TYPES = {
  NSE_CM: 1,
  NSE_FO: 2,
  BSE_CM: 3,
  BSE_FO: 4,
  MCX_FO: 5,
  NCX_FO: 7,
  CKS_FO: 13,
} as const;

/**
 * Maps exchange segment strings (NFO, BFO, MCX) to SmartStream exchange numeric codes.
 */
export function getSmartStreamExchangeType(segment: string): number {
  const upper = segment.toUpperCase();
  if (upper === 'NFO' || upper === 'NSE_FO') return SMART_STREAM_EXCHANGE_TYPES.NSE_FO;
  if (upper === 'BFO' || upper === 'BSE_FO') return SMART_STREAM_EXCHANGE_TYPES.BSE_FO;
  if (upper === 'MCX' || upper === 'MCX_FO') return SMART_STREAM_EXCHANGE_TYPES.MCX_FO;
  if (upper === 'BSE') return SMART_STREAM_EXCHANGE_TYPES.BSE_CM;
  return SMART_STREAM_EXCHANGE_TYPES.NSE_CM;
}

/**
 * Parses binary Little-Endian packet received from Angel One SmartStream WebSocket 2.0.
 */
export function parseSmartStreamBinary(buffer: Buffer): SmartStreamTick | null {
  // LTP packet is at least 51 bytes
  if (!buffer || buffer.length < 51) {
    return null;
  }

  try {
    const subscriptionMode = buffer.readInt8(0);
    const exchangeType = buffer.readInt8(1);

    // Bytes 2..26: 25-byte null-padded token
    let token = buffer.toString('utf8', 2, 27);
    const nullIdx = token.indexOf('\0');
    if (nullIdx !== -1) {
      token = token.substring(0, nullIdx);
    }
    token = token.trim();

    // Bytes 27..34: Sequence number (int64 LE)
    const sequenceNumber = Number(buffer.readBigInt64LE(27));

    // Bytes 35..42: Exchange timestamp (int64 LE epoch ms)
    const exchangeTimestamp = Number(buffer.readBigInt64LE(35));

    // Bytes 43..46/50: LTP in paise (int32 LE or int64 LE)
    const ltpPaise = buffer.readInt32LE(43);
    const ltp = ltpPaise / 100;

    const tick: SmartStreamTick = {
      subscriptionMode,
      exchangeType,
      token,
      sequenceNumber,
      exchangeTimestamp,
      ltp,
      receivedAt: new Date().toISOString(),
    };

    // Mode 2 (Quote) has extended data (87+ bytes)
    if (subscriptionMode === 2 && buffer.length >= 87) {
      tick.lastTradedQty = buffer.readInt32LE(47);
      tick.avgTradedPrice = buffer.readInt32LE(51) / 100;
      tick.volume = Number(buffer.readBigInt64LE(55));

      if (buffer.length >= 95) {
        try {
          tick.open = buffer.readInt32LE(79) / 100;
          tick.high = buffer.readInt32LE(83) / 100;
          tick.low = buffer.readInt32LE(87) / 100;
          tick.close = buffer.readInt32LE(91) / 100;
        } catch {
          // Ignore partial trailing bytes
        }
      }
    }

    return tick;
  } catch {
    return null;
  }
}

/**
 * Singleton server-side WebSocket client for Angel One SmartStream 2.0.
 * Shields browser clients from broker credentials and rate-limits connections to 1 shared socket.
 */
export class AngelOneSmartStream {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isExplicitlyClosed = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private readonly maxReconnectDelayMs = 30000;

  // Active subscriptions: exchangeType -> Set of tokens
  private subscribedTokens = new Map<number, Set<string>>();
  // Latest tick cache: token -> SmartStreamTick
  private latestTicks = new Map<string, SmartStreamTick>();
  // Registered tick listeners
  private listeners = new Set<TickListener>();

  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribes a listener to live tick events.
   * Returns an unsubscribe cleanup function.
   */
  public subscribeTicks(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Retrieves the most recently cached tick for an instrument token.
   */
  public getLatestTick(token: string): SmartStreamTick | undefined {
    return this.latestTicks.get(token);
  }

  /**
   * Connects to Angel One SmartStream WebSocket server.
   */
  public async connect(): Promise<void> {
    const config = getServerMarketDataConfig();
    if (!config.angelOne.isConfigured || !config.angelOne.apiKey || !config.angelOne.clientCode) {
      return;
    }

    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.isExplicitlyClosed = false;

    try {
      const session = await angelOneAuth.getSession();
      const wsUrl = config.angelOne.wsUrl;
      const apiKey = config.angelOne.apiKey;
      const clientCode = config.angelOne.clientCode;

      if (!apiKey || !clientCode) {
        this.isConnecting = false;
        return;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.jwtToken}`,
        'x-api-key': apiKey,
        'x-client-code': clientCode,
        'x-feed-token': session.feedToken,
      };

      const socket = new WebSocket(wsUrl, { headers });
      this.ws = socket;

      socket.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.resubscribeAll();
      });

      socket.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
        if (!isBinary) {
          const text = data.toString();
          if (text === 'pong') {
            // Heartbeat response acknowledged
            return;
          }
          return;
        }

        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const tick = parseSmartStreamBinary(buffer);
        if (tick) {
          this.latestTicks.set(tick.token, tick);
          this.broadcastTick(tick);
        }
      });

      socket.on('close', () => {
        this.cleanupSocket();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      });

      socket.on('error', () => {
        // Handled via close event
      });
    } catch {
      this.isConnecting = false;
      this.cleanupSocket();
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Dynamically subscribes tokens to live market feed.
   */
  public subscribeTokens(subscriptions: Array<{ exchangeType: number; tokens: string[] }>, mode = 1): void {
    if (!subscriptions || subscriptions.length === 0) return;

    // Track active subscriptions in memory
    for (const sub of subscriptions) {
      let set = this.subscribedTokens.get(sub.exchangeType);
      if (!set) {
        set = new Set<string>();
        this.subscribedTokens.set(sub.exchangeType, set);
      }
      for (const t of sub.tokens) {
        if (t) set.add(t);
      }
    }

    if (!this.isConnected) {
      // Connect will automatically resubscribe once open
      this.connect().catch(() => {});
      return;
    }

    const payload = {
      action: 1, // 1 = Subscribe
      params: {
        mode, // 1 = LTP, 2 = Quote
        tokenList: subscriptions.map((s) => ({
          exchangeType: s.exchangeType,
          tokens: s.tokens,
        })),
      },
    };

    try {
      this.ws?.send(JSON.stringify(payload));
    } catch {
      // Handled via reconnect
    }
  }

  /**
   * Dynamically unsubscribes tokens from live market feed.
   */
  public unsubscribeTokens(unsubscriptions: Array<{ exchangeType: number; tokens: string[] }>): void {
    if (!unsubscriptions || unsubscriptions.length === 0) return;

    for (const unsub of unsubscriptions) {
      const set = this.subscribedTokens.get(unsub.exchangeType);
      if (set) {
        for (const t of unsub.tokens) {
          set.delete(t);
        }
      }
    }

    if (!this.isConnected) return;

    const payload = {
      action: 0, // 0 = Unsubscribe
      params: {
        mode: 1,
        tokenList: unsubscriptions.map((s) => ({
          exchangeType: s.exchangeType,
          tokens: s.tokens,
        })),
      },
    };

    try {
      this.ws?.send(JSON.stringify(payload));
    } catch {
      // Socket closed
    }
  }

  /**
   * Resubscribes all tracked tokens after reconnection.
   */
  private resubscribeAll(): void {
    if (!this.isConnected || this.subscribedTokens.size === 0) return;

    const list: Array<{ exchangeType: number; tokens: string[] }> = [];
    this.subscribedTokens.forEach((tokensSet, exchangeType) => {
      if (tokensSet.size > 0) {
        list.push({
          exchangeType,
          tokens: Array.from(tokensSet),
        });
      }
    });

    if (list.length > 0) {
      const payload = {
        action: 1,
        params: {
          mode: 1,
          tokenList: list,
        },
      };
      try {
        this.ws?.send(JSON.stringify(payload));
      } catch {
        // Ignored
      }
    }
  }

  private broadcastTick(tick: SmartStreamTick): void {
    this.listeners.forEach((listener) => {
      try {
        listener(tick);
      } catch {
        // Protect listener failures from breaking broadcast
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send('ping');
        } catch {
          // Socket might have closed
        }
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempt += 1;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), this.maxReconnectDelayMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delay);
  }

  private cleanupSocket(): void {
    this.isConnecting = false;
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }

  /**
   * Explicitly closes the WebSocket connection and prevents auto-reconnect.
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
  }
}

export const angelOneSmartStream = new AngelOneSmartStream();
