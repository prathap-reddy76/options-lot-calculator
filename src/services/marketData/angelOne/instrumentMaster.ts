import * as fs from 'fs';
import * as path from 'path';
import { ExchangeCode } from '@/types/api';
import { InstrumentId, OptionType } from '@/types/market';
import { getServerMarketDataConfig } from '../config';
import { MarketDataError } from '../errors';

export interface RawScripRecord {
  token: string;
  symbol: string;
  name: string;
  expiry?: string;
  strike?: string | number;
  lotsize?: string | number;
  instrumenttype?: string;
  exch_seg: string;
  tick_size?: string | number;
}

export interface ParsedOptionContract {
  token: string;
  symbol: string; // Trading symbol, e.g. NIFTY26OCT24500CE
  underlyingSymbol: string; // e.g. NIFTY, SENSEX, CRUDEOIL
  exchange: ExchangeCode; // NSE, BSE, MCX
  exchangeSegment: string; // NFO, BFO, MCX
  expiryDate: string; // Normalized YYYY-MM-DD
  strikePrice: number; // In Rupees (scaled from paisa if required)
  optionType: OptionType; // CE or PE
  lotSize: number;
  tickSize: number;
}

const MONTH_MAP: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

/**
 * Normalizes SmartAPI expiry strings (e.g. "24OCT2024" or "31OCT2026") into ISO "YYYY-MM-DD".
 */
export function normalizeExpiryDate(expiryStr?: string): string | null {
  if (!expiryStr || typeof expiryStr !== 'string') return null;
  const trimmed = expiryStr.trim().toUpperCase();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle DDMMMYYYY (e.g. 29OCT2026 or 29-OCT-2026)
  const match = trimmed.match(/^(\d{1,2})[-\s]?([A-Z]{3})[-\s]?(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2]];
    const year = match[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Normalizes strike prices.
 * In Angel One Scrip Master for NFO/BFO, strike prices are often represented in paise (multiplied by 100),
 * e.g., 2450000.000000 for strike 24500.
 */
export function normalizeStrikePrice(rawStrike: string | number | undefined, symbol: string): number | null {
  // First attempt: Extract strike from standard trading symbol pattern (e.g. NIFTY26OCT24500CE -> 24500)
  const symbolMatch = symbol.match(/(\d+(?:\.\d+)?)(CE|PE)$/i);
  if (symbolMatch && symbolMatch[1]) {
    const parsedFromSymbol = parseFloat(symbolMatch[1]);
    if (!isNaN(parsedFromSymbol) && parsedFromSymbol > 0) {
      return parsedFromSymbol;
    }
  }

  if (rawStrike === undefined || rawStrike === null) return null;
  const num = typeof rawStrike === 'number' ? rawStrike : parseFloat(rawStrike);
  if (isNaN(num) || num <= 0) return null;

  // In Indian derivative scrip masters, index strikes > 10000 scaled in paise:
  if (num >= 100000) {
    return num / 100;
  }

  return num;
}

/**
 * Maps application InstrumentId to Angel One segment and underlying name.
 */
export function mapInstrumentToAngelOne(id: InstrumentId): {
  exchangeSegment: 'NFO' | 'BFO' | 'MCX';
  exchange: ExchangeCode;
  underlyingName: string;
} | null {
  switch (id) {
    case 'NIFTY_50':
      return { exchangeSegment: 'NFO', exchange: 'NSE', underlyingName: 'NIFTY' };
    case 'BANK_NIFTY':
      return { exchangeSegment: 'NFO', exchange: 'NSE', underlyingName: 'BANKNIFTY' };
    case 'FINNIFTY':
      return { exchangeSegment: 'NFO', exchange: 'NSE', underlyingName: 'FINNIFTY' };
    case 'MIDCPNIFTY':
      return { exchangeSegment: 'NFO', exchange: 'NSE', underlyingName: 'MIDCPNIFTY' };
    case 'SENSEX':
      return { exchangeSegment: 'BFO', exchange: 'BSE', underlyingName: 'SENSEX' };
    case 'GOLD':
      return { exchangeSegment: 'MCX', exchange: 'MCX', underlyingName: 'GOLD' };
    case 'SILVER':
      return { exchangeSegment: 'MCX', exchange: 'MCX', underlyingName: 'SILVER' };
    case 'CRUDE_OIL':
      return { exchangeSegment: 'MCX', exchange: 'MCX', underlyingName: 'CRUDEOIL' };
    case 'NATURAL_GAS':
      return { exchangeSegment: 'MCX', exchange: 'MCX', underlyingName: 'NATURALGAS' };
    case 'COPPER':
      return { exchangeSegment: 'MCX', exchange: 'MCX', underlyingName: 'COPPER' };
    case 'ZINC':
      return null; // Zinc options not traded
    default:
      return null;
  }
}

/**
 * Service for caching and querying the Angel One SmartAPI Instrument Master.
 */
export class AngelOneInstrumentMasterService {
  private cacheTimestamp = 0;
  private byUnderlying = new Map<string, ParsedOptionContract[]>(); // key: "NFO:NIFTY"
  private byToken = new Map<string, ParsedOptionContract>();
  private isDownloading = false;
  private downloadPromise: Promise<void> | null = null;

  /**
   * Allows injecting pre-parsed mock scrips for lightning-fast deterministic unit testing.
   */
  public loadMockData(records: RawScripRecord[], referenceDate?: Date): void {
    this.byUnderlying.clear();
    this.byToken.clear();
    this.processRawRecords(records, referenceDate);
    this.cacheTimestamp = Date.now();
  }

  /**
   * Resets in-memory cache.
   */
  public clearCache(): void {
    this.cacheTimestamp = 0;
    this.byUnderlying.clear();
    this.byToken.clear();
  }

  private getDiskCachePath(): string {
    const cacheDir = path.join(process.cwd(), '.cache');
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch {
      // Ignore if filesystem is read-only
    }
    return path.join(cacheDir, 'OpenAPIScripMaster.json');
  }

  private tryLoadFromDiskCache(ttlMs: number): boolean {
    try {
      const diskPath = this.getDiskCachePath();
      if (!fs.existsSync(diskPath)) return false;
      const stats = fs.statSync(diskPath);
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs > ttlMs) return false;

      const fileContent = fs.readFileSync(diskPath, 'utf8');
      const rawRecords: RawScripRecord[] = JSON.parse(fileContent);
      if (Array.isArray(rawRecords) && rawRecords.length > 0) {
        this.byUnderlying.clear();
        this.byToken.clear();
        this.processRawRecords(rawRecords);
        this.cacheTimestamp = stats.mtimeMs;
        return true;
      }
    } catch {
      // In case of any disk read or parse error, fall back to network download
    }
    return false;
  }

  private trySaveToDiskCache(records: RawScripRecord[]): void {
    try {
      const diskPath = this.getDiskCachePath();
      fs.writeFileSync(diskPath, JSON.stringify(records), 'utf8');
    } catch {
      // Non-critical, ignore write errors
    }
  }

  /**
   * Ensures the instrument master is loaded and fresh.
   */
  public async ensureLoaded(): Promise<void> {
    const config = getServerMarketDataConfig();
    const now = Date.now();

    // 1. In-memory cache is fresh within TTL
    if (this.cacheTimestamp > 0 && now - this.cacheTimestamp < config.scripMasterCacheTtlMs) {
      return;
    }

    // 2. Try loading from persistent disk cache
    if (this.tryLoadFromDiskCache(config.scripMasterCacheTtlMs)) {
      return;
    }

    if (this.isDownloading && this.downloadPromise) {
      return await this.downloadPromise;
    }

    this.isDownloading = true;
    this.downloadPromise = this.downloadScripMaster()
      .then(() => {
        this.cacheTimestamp = Date.now();
        this.isDownloading = false;
        this.downloadPromise = null;
      })
      .catch((err) => {
        this.isDownloading = false;
        this.downloadPromise = null;
        throw err;
      });

    return await this.downloadPromise;
  }

  /**
   * Downloads and processes the scrip master JSON.
   */
  private async downloadScripMaster(): Promise<void> {
    const config = getServerMarketDataConfig();
    const url = config.angelOne.scripMasterUrl;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30 sec timeout for 30MB payload
      });
    } catch (err: unknown) {
      throw MarketDataError.networkError(
        'Angel One Scrip Master',
        err instanceof Error ? err.message : 'Failed to download instrument master'
      );
    }

    if (!response.ok) {
      throw new MarketDataError(
        'NETWORK_ERROR',
        `Failed to download Angel One Scrip Master: HTTP ${response.status}`
      );
    }

    const rawRecords: RawScripRecord[] = await response.json();
    this.byUnderlying.clear();
    this.byToken.clear();
    this.processRawRecords(rawRecords);
    this.trySaveToDiskCache(rawRecords);
  }

  /**
   * Parses and indexes raw scrip records.
   */
  public processRawRecords(records: RawScripRecord[], referenceDate?: Date): void {
    const now = referenceDate || new Date();
    // Exclude contracts expired before today
    const todayStr = now.toISOString().split('T')[0];

    for (const r of records) {
      // 1. Filter out non-options (only accept OPTIDX, OPTSTK, OPTFUT)
      const instType = (r.instrumenttype || '').toUpperCase();
      if (!instType.startsWith('OPT')) {
        continue;
      }

      // 2. Validate exchange segment (NFO, BFO, MCX)
      const exchSeg = (r.exch_seg || '').toUpperCase();
      let exchange: ExchangeCode;
      if (exchSeg === 'NFO') exchange = 'NSE';
      else if (exchSeg === 'BFO') exchange = 'BSE';
      else if (exchSeg === 'MCX') exchange = 'MCX';
      else continue;

      // 3. Normalize expiry
      const expiry = normalizeExpiryDate(r.expiry);
      if (!expiry || expiry < todayStr) {
        continue;
      }

      // 4. Normalize option type (CE or PE)
      const symUpper = (r.symbol || '').toUpperCase();
      let optionType: OptionType;
      if (symUpper.endsWith('CE')) optionType = 'CE';
      else if (symUpper.endsWith('PE')) optionType = 'PE';
      else continue;

      // 5. Normalize strike price
      const strike = normalizeStrikePrice(r.strike, symUpper);
      if (strike === null || strike <= 0) {
        continue;
      }

      // 6. Lot size
      const lotSize = typeof r.lotsize === 'number' ? r.lotsize : parseInt(String(r.lotsize || '1'), 10);
      const validLot = !isNaN(lotSize) && lotSize > 0 ? lotSize : 1;

      // 7. Underlying name (e.g. NIFTY, BANKNIFTY)
      const underlying = (r.name || '').toUpperCase().trim();
      if (!underlying) continue;

      const contract: ParsedOptionContract = {
        token: String(r.token).trim(),
        symbol: symUpper,
        underlyingSymbol: underlying,
        exchange,
        exchangeSegment: exchSeg,
        expiryDate: expiry,
        strikePrice: strike,
        optionType,
        lotSize: validLot,
        tickSize: typeof r.tick_size === 'number' ? r.tick_size : parseFloat(String(r.tick_size || '0.05')) || 0.05,
      };

      const key = `${exchSeg}:${underlying}`;
      const existing = this.byUnderlying.get(key);
      if (existing) {
        existing.push(contract);
      } else {
        this.byUnderlying.set(key, [contract]);
      }

      this.byToken.set(contract.token, contract);
    }
  }

  /**
   * Retrieves available sorted expiry dates for a given underlying.
   */
  public async getAvailableExpiries(instrumentId: InstrumentId): Promise<string[]> {
    await this.ensureLoaded();
    const mapping = mapInstrumentToAngelOne(instrumentId);
    if (!mapping) return [];

    const key = `${mapping.exchangeSegment}:${mapping.underlyingName}`;
    const contracts = this.byUnderlying.get(key) || [];

    const expiriesSet = new Set<string>();
    for (const c of contracts) {
      expiriesSet.add(c.expiryDate);
    }

    return Array.from(expiriesSet).sort();
  }

  /**
   * Retrieves distinct sorted strikes available for a given underlying and expiry date.
   */
  public async getStrikesForExpiry(instrumentId: InstrumentId, expiryDate: string): Promise<number[]> {
    await this.ensureLoaded();
    const mapping = mapInstrumentToAngelOne(instrumentId);
    if (!mapping) return [];

    const key = `${mapping.exchangeSegment}:${mapping.underlyingName}`;
    const contracts = this.byUnderlying.get(key) || [];

    const strikeSet = new Set<number>();
    for (const c of contracts) {
      if (c.expiryDate === expiryDate) {
        strikeSet.add(c.strikePrice);
      }
    }

    return Array.from(strikeSet).sort((a, b) => a - b);
  }

  /**
   * Retrieves option contracts for a specific underlying and expiry grouped by strike price.
   */
  public async getContractsForExpiry(
    instrumentId: InstrumentId,
    expiryDate: string
  ): Promise<Map<number, { ce?: ParsedOptionContract; pe?: ParsedOptionContract }>> {
    await this.ensureLoaded();
    const mapping = mapInstrumentToAngelOne(instrumentId);
    if (!mapping) return new Map();

    const key = `${mapping.exchangeSegment}:${mapping.underlyingName}`;
    const contracts = this.byUnderlying.get(key) || [];

    const grouped = new Map<number, { ce?: ParsedOptionContract; pe?: ParsedOptionContract }>();

    for (const c of contracts) {
      if (c.expiryDate === expiryDate) {
        const pair = grouped.get(c.strikePrice) || {};
        if (c.optionType === 'CE') {
          pair.ce = c;
        } else if (c.optionType === 'PE') {
          pair.pe = c;
        }
        grouped.set(c.strikePrice, pair);
      }
    }

    return grouped;
  }

  /**
   * Finds a contract by exact parameters.
   */
  public async findContract(
    instrumentId: InstrumentId,
    expiryDate: string,
    strikePrice: number,
    optionType: OptionType
  ): Promise<ParsedOptionContract | null> {
    await this.ensureLoaded();
    const mapping = mapInstrumentToAngelOne(instrumentId);
    if (!mapping) return null;

    const key = `${mapping.exchangeSegment}:${mapping.underlyingName}`;
    const contracts = this.byUnderlying.get(key) || [];

    return (
      contracts.find(
        (c) =>
          c.expiryDate === expiryDate &&
          c.strikePrice === strikePrice &&
          c.optionType === optionType
      ) || null
    );
  }

  /**
   * Looks up contract by instrument token.
   */
  public getContractByToken(token: string): ParsedOptionContract | null {
    return this.byToken.get(token) || null;
  }
}

export const angelOneInstrumentMaster = new AngelOneInstrumentMasterService();
