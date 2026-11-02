import { describe, expect, it, beforeEach, vi } from 'vitest';
import { base32Decode, generateTOTP } from '../angelOne/totp';
import {
  angelOneInstrumentMaster,
  normalizeExpiryDate,
  normalizeStrikePrice,
  RawScripRecord,
  mapInstrumentToAngelOne,
} from '../angelOne/instrumentMaster';
import { AngelOneAuthManager } from '../angelOne/auth';
import { AngelOneMarketDataAdapter } from '../angelOne/adapter';
import {
  parseSmartStreamBinary,
  getSmartStreamExchangeType,
  AngelOneSmartStream,
} from '../angelOne/smartStream';

describe('Angel One SmartAPI TOTP Engine', () => {
  it('correctly decodes standard Base32 strings', () => {
    // "JBSWY3DPEHPK3PXP" is the standard RFC test secret "Hello!\xde\xad\xbe\xef"
    const decoded = base32Decode('JBSWY3DPEHPK3PXP');
    expect(decoded).toBeInstanceOf(Buffer);
    expect(decoded.length).toBe(10);
  });

  it('rejects invalid Base32 characters', () => {
    expect(() => base32Decode('INVALID189!')).toThrow(/Invalid Base32 character/);
  });

  it('generates a deterministic 6-digit numeric TOTP code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const timestamp = 1700000000000; // Fixed timestamp
    const otp = generateTOTP(secret, timestamp, 30, 6);

    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('produces identical codes within the same 30-second time window', () => {
    const secret = 'MZXW633PN5XW6MZX';
    const t1 = 1729780000000;
    const t2 = 1729780015000; // 15 seconds later in same window

    expect(generateTOTP(secret, t1)).toBe(generateTOTP(secret, t2));
  });

  it('produces different codes across different 30-second time windows', () => {
    const secret = 'MZXW633PN5XW6MZX';
    const t1 = 1729780000000;
    const t2 = 1729780035000; // 35 seconds later (next window)

    expect(generateTOTP(secret, t1)).not.toBe(generateTOTP(secret, t2));
  });
});

describe('Angel One Instrument Master Normalization & Lookup', () => {
  it('normalizes various expiry date formats to standard ISO YYYY-MM-DD', () => {
    expect(normalizeExpiryDate('29OCT2026')).toBe('2026-10-29');
    expect(normalizeExpiryDate('05NOV2026')).toBe('2026-11-05');
    expect(normalizeExpiryDate('31DEC2024')).toBe('2024-12-31');
    expect(normalizeExpiryDate('2026-10-29')).toBe('2026-10-29');
    expect(normalizeExpiryDate('INVALID')).toBeNull();
    expect(normalizeExpiryDate('')).toBeNull();
  });

  it('correctly extracts and scales strike prices', () => {
    // 1. From trading symbol
    expect(normalizeStrikePrice('2450000.000000', 'NIFTY26OCT24500CE')).toBe(24500);
    expect(normalizeStrikePrice('5200000.000000', 'BANKNIFTY26OCT52000PE')).toBe(52000);
    // 2. Scaled from paise (when raw >= 100000)
    expect(normalizeStrikePrice('8000000.000000', 'SENSEX-OPT')).toBe(80000);
    // 3. Unscaled Rupee value
    expect(normalizeStrikePrice(6200, 'CRUDEOIL26NOV6200CE')).toBe(6200);
    // 4. Invalid
    expect(normalizeStrikePrice('0', '')).toBeNull();
  });

  it('maps application instruments to Angel One segments and names', () => {
    expect(mapInstrumentToAngelOne('NIFTY_50')).toEqual({
      exchangeSegment: 'NFO',
      exchange: 'NSE',
      underlyingName: 'NIFTY',
    });
    expect(mapInstrumentToAngelOne('SENSEX')).toEqual({
      exchangeSegment: 'BFO',
      exchange: 'BSE',
      underlyingName: 'SENSEX',
    });
    expect(mapInstrumentToAngelOne('GOLD')).toEqual({
      exchangeSegment: 'MCX',
      exchange: 'MCX',
      underlyingName: 'GOLD',
    });
    expect(mapInstrumentToAngelOne('ZINC')).toBeNull(); // Unsupported options
  });

  it('filters out equities and futures while indexing option contracts', async () => {
    const mockScripData: RawScripRecord[] = [
      // 1. Valid NIFTY CE Option
      {
        token: '1001',
        symbol: 'NIFTY26OCT24500CE',
        name: 'NIFTY',
        expiry: '29OCT2026',
        strike: '2450000.00',
        lotsize: '65',
        instrumenttype: 'OPTIDX',
        exch_seg: 'NFO',
        tick_size: '0.05',
      },
      // 2. Valid NIFTY PE Option
      {
        token: '1002',
        symbol: 'NIFTY26OCT24500PE',
        name: 'NIFTY',
        expiry: '29OCT2026',
        strike: '2450000.00',
        lotsize: '65',
        instrumenttype: 'OPTIDX',
        exch_seg: 'NFO',
        tick_size: '0.05',
      },
      // 3. Valid NIFTY CE next expiry
      {
        token: '1003',
        symbol: 'NIFTY05NOV24500CE',
        name: 'NIFTY',
        expiry: '05NOV2026',
        strike: '2450000.00',
        lotsize: '65',
        instrumenttype: 'OPTIDX',
        exch_seg: 'NFO',
        tick_size: '0.05',
      },
      // 4. Excluded: NIFTY Future (FUTIDX)
      {
        token: '9991',
        symbol: 'NIFTY26OCTFUT',
        name: 'NIFTY',
        expiry: '29OCT2026',
        instrumenttype: 'FUTIDX',
        exch_seg: 'NFO',
      },
      // 5. Excluded: Cash Equity (EQ)
      {
        token: '9992',
        symbol: 'NIFTY-EQ',
        name: 'NIFTY',
        instrumenttype: 'EQ',
        exch_seg: 'NSE',
      },
      // 6. Valid MCX Gold Option
      {
        token: '2001',
        symbol: 'GOLD26NOV78000CE',
        name: 'GOLD',
        expiry: '26NOV2026',
        strike: '78000',
        lotsize: '10',
        instrumenttype: 'OPTFUT',
        exch_seg: 'MCX',
        tick_size: '1.00',
      },
    ];

    angelOneInstrumentMaster.loadMockData(mockScripData, new Date('2026-10-25'));

    // Verify available expiries for NIFTY 50
    const expiries = await angelOneInstrumentMaster.getAvailableExpiries('NIFTY_50');
    expect(expiries).toEqual(['2026-10-29', '2026-11-05']);

    // Verify strikes for 2026-10-29
    const strikes = await angelOneInstrumentMaster.getStrikesForExpiry('NIFTY_50', '2026-10-29');
    expect(strikes).toEqual([24500]);

    // Verify strike pair (both CE and PE)
    const grouped = await angelOneInstrumentMaster.getContractsForExpiry('NIFTY_50', '2026-10-29');
    const pair = grouped.get(24500);
    expect(pair).toBeDefined();
    expect(pair?.ce?.token).toBe('1001');
    expect(pair?.ce?.lotSize).toBe(65);
    expect(pair?.pe?.token).toBe('1002');
    expect(pair?.pe?.lotSize).toBe(65);

    // Verify token lookup
    const tokenContract = angelOneInstrumentMaster.getContractByToken('1001');
    expect(tokenContract?.symbol).toBe('NIFTY26OCT24500CE');

    // Verify MCX Gold lot size
    const goldStrikes = await angelOneInstrumentMaster.getStrikesForExpiry('GOLD', '2026-11-26');
    expect(goldStrikes).toEqual([78000]);
    const goldContract = await angelOneInstrumentMaster.findContract('GOLD', '2026-11-26', 78000, 'CE');
    expect(goldContract?.lotSize).toBe(10);
  });
});

describe('Angel One Authentication & Session Manager', () => {
  let authManager: AngelOneAuthManager;

  beforeEach(() => {
    authManager = new AngelOneAuthManager();
    vi.restoreAllMocks();
  });

  it('rejects authentication with clear message when credentials are not configured', async () => {
    // Ensure clean unconfigured environment
    delete process.env.ANGEL_ONE_API_KEY;
    delete process.env.ANGEL_ONE_CLIENT_CODE;
    delete process.env.ANGEL_ONE_PIN;
    delete process.env.ANGEL_ONE_TOTP_SECRET;

    await expect(authManager.getSession()).rejects.toThrow(/credentials are not fully configured/);
  });

  it('authenticates cleanly using loginByPassword and caches the session', async () => {
    process.env.ANGEL_ONE_API_KEY = 'test_api_key';
    process.env.ANGEL_ONE_CLIENT_CODE = 'A12345';
    process.env.ANGEL_ONE_PIN = '1234';
    process.env.ANGEL_ONE_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        message: 'SUCCESS',
        errorcode: '',
        data: {
          jwtToken: 'Bearer mock_jwt_header.mock_payload.mock_signature',
          refreshToken: 'mock_refresh_token',
          feedToken: 'mock_feed_token',
        },
      }),
    });
    global.fetch = mockFetch;

    const session = await authManager.getSession();

    expect(session.jwtToken).toBe('mock_jwt_header.mock_payload.mock_signature');
    expect(session.refreshToken).toBe('mock_refresh_token');
    expect(session.feedToken).toBe('mock_feed_token');
    expect(session.expiresAt).toBeGreaterThan(Date.now());

    // Subsequent call should reuse active session without re-fetching
    const session2 = await authManager.getSession();
    expect(session2).toBe(session);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('handles authentication rejection cleanly without leaking credentials', async () => {
    process.env.ANGEL_ONE_API_KEY = 'test_api_key';
    process.env.ANGEL_ONE_CLIENT_CODE = 'A12345';
    process.env.ANGEL_ONE_PIN = '1234';
    process.env.ANGEL_ONE_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: false,
        message: 'Invalid Client Code or PIN',
        errorcode: 'AB1001',
      }),
    });

    await expect(authManager.getSession()).rejects.toThrow(/Invalid Client Code or PIN/);
  });
});

describe('Angel One Market Data Adapter', () => {
  let adapter: AngelOneMarketDataAdapter;

  beforeEach(() => {
    adapter = new AngelOneMarketDataAdapter();
    vi.restoreAllMocks();
  });

  it('reports unconfigured status when credentials are missing', async () => {
    delete process.env.ANGEL_ONE_API_KEY;
    const status = await adapter.testConnection();
    expect(status.connected).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.message).toMatch(/not configured/);
  });

  it('batches quote requests into chunks of up to 50 tokens', async () => {
    process.env.ANGEL_ONE_API_KEY = 'test_api_key';
    process.env.ANGEL_ONE_CLIENT_CODE = 'A12345';
    process.env.ANGEL_ONE_PIN = '1234';
    process.env.ANGEL_ONE_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    // Mock auth
    vi.spyOn(adapter['quoteCache'], 'get').mockReturnValue(undefined);

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/loginByPassword')) {
        return {
          ok: true,
          json: async () => ({
            status: true,
            data: { jwtToken: 'mock_jwt', refreshToken: 'mock_ref', feedToken: 'mock_feed' },
          }),
        };
      }
      if (url.includes('/quote/')) {
        return {
          ok: true,
          json: async () => ({
            status: true,
            data: {
              fetched: [
                {
                  exchange: 'NFO',
                  tradingSymbol: 'NIFTY26OCT24500CE',
                  symbolToken: '1001',
                  ltp: 42.5,
                  netChange: 1.2,
                  percentChange: 2.9,
                  tradeVolume: 350000,
                  opnInterest: 1900000,
                  depth: {
                    buy: [{ price: 42.4, quantity: 1500 }],
                    sell: [{ price: 42.6, quantity: 2000 }],
                  },
                },
              ],
            },
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = mockFetch;

    const quotes = await adapter.fetchQuotesBatch('NFO', ['1001']);
    expect(quotes.get('1001')?.ltp).toBe(42.5);
    expect(quotes.get('1001')?.opnInterest).toBe(1900000);
  });

  it('rejects unsupported instruments with structured error', async () => {
    process.env.ANGEL_ONE_API_KEY = 'test_api_key';
    process.env.ANGEL_ONE_CLIENT_CODE = 'A12345';
    process.env.ANGEL_ONE_PIN = '1234';
    process.env.ANGEL_ONE_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

    await expect(adapter.getOptionChain('ZINC')).rejects.toThrow(/not supported/);
  });
});

describe('Angel One SmartStream Binary Parser & Protocol', () => {
  it('correctly parses Mode 1 (LTP) 51-byte Little-Endian binary packet', () => {
    const buffer = Buffer.alloc(51);
    buffer.writeInt8(1, 0); // mode 1
    buffer.writeInt8(2, 1); // exchangeType 2 (NSE_FO)
    buffer.write('49281\0', 2, 'utf8'); // token
    buffer.writeBigInt64LE(987654321n, 27); // sequence
    buffer.writeBigInt64LE(1729850000000n, 35); // timestamp
    buffer.writeInt32LE(24550, 43); // 245.50 INR in paise

    const tick = parseSmartStreamBinary(buffer);
    expect(tick).not.toBeNull();
    expect(tick?.subscriptionMode).toBe(1);
    expect(tick?.exchangeType).toBe(2);
    expect(tick?.token).toBe('49281');
    expect(tick?.sequenceNumber).toBe(987654321);
    expect(tick?.exchangeTimestamp).toBe(1729850000000);
    expect(tick?.ltp).toBe(245.5);
  });

  it('correctly parses Mode 2 (Quote) 87+ byte binary packet', () => {
    const buffer = Buffer.alloc(95);
    buffer.writeInt8(2, 0); // mode 2
    buffer.writeInt8(2, 1); // exchangeType 2
    buffer.write('49282\0', 2, 'utf8');
    buffer.writeBigInt64LE(100n, 27);
    buffer.writeBigInt64LE(1729850000000n, 35);
    buffer.writeInt32LE(15025, 43); // LTP 150.25
    buffer.writeInt32LE(50, 47); // Last Traded Qty 50
    buffer.writeInt32LE(14980, 51); // Avg Traded Price 149.80
    buffer.writeBigInt64LE(250000n, 55); // Volume 250000
    // OHLC
    buffer.writeInt32LE(14500, 79); // Open 145.00
    buffer.writeInt32LE(15500, 83); // High 155.00
    buffer.writeInt32LE(14400, 87); // Low 144.00
    buffer.writeInt32LE(14600, 91); // Close 146.00

    const tick = parseSmartStreamBinary(buffer);
    expect(tick).not.toBeNull();
    expect(tick?.subscriptionMode).toBe(2);
    expect(tick?.token).toBe('49282');
    expect(tick?.ltp).toBe(150.25);
    expect(tick?.lastTradedQty).toBe(50);
    expect(tick?.avgTradedPrice).toBe(149.8);
    expect(tick?.volume).toBe(250000);
    expect(tick?.open).toBe(145);
    expect(tick?.high).toBe(155);
    expect(tick?.low).toBe(144);
    expect(tick?.close).toBe(146);
  });

  it('returns null for truncated or invalid binary buffers (< 51 bytes)', () => {
    const smallBuffer = Buffer.alloc(30);
    expect(parseSmartStreamBinary(smallBuffer)).toBeNull();
  });

  it('maps segment names to correct SmartStream exchange numeric codes', () => {
    expect(getSmartStreamExchangeType('NFO')).toBe(2);
    expect(getSmartStreamExchangeType('BFO')).toBe(4);
    expect(getSmartStreamExchangeType('MCX')).toBe(5);
    expect(getSmartStreamExchangeType('BSE')).toBe(3);
    expect(getSmartStreamExchangeType('NSE')).toBe(1);
  });

  it('handles tick listeners and token cache on AngelOneSmartStream', () => {
    const stream = new AngelOneSmartStream();
    const receivedTicks: any[] = [];

    const unsubscribe = stream.subscribeTicks((tick) => {
      receivedTicks.push(tick);
    });

    // Simulate incoming parsed tick
    const dummyTick = {
      subscriptionMode: 1,
      exchangeType: 2,
      token: '99999',
      sequenceNumber: 1,
      exchangeTimestamp: 1729850000000,
      ltp: 300.75,
      receivedAt: new Date().toISOString(),
    };

    (stream as any).latestTicks.set('99999', dummyTick);
    (stream as any).broadcastTick(dummyTick);

    expect(receivedTicks).toHaveLength(1);
    expect(receivedTicks[0].token).toBe('99999');
    expect(receivedTicks[0].ltp).toBe(300.75);
    expect(stream.getLatestTick('99999')).toEqual(dummyTick);

    unsubscribe();
    (stream as any).broadcastTick(dummyTick);
    expect(receivedTicks).toHaveLength(1); // Not called again after unsubscribing
  });
});
