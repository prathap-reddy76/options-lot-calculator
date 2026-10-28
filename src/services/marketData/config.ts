/**
 * Server-Side Market Data Configuration Manager.
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. This file must ONLY execute within server environments (API routes, Server Actions, Server Components).
 * 2. It reads un-prefixed environment variables which are NEVER bundled into client-side browser JavaScript.
 * 3. It exposes sanitised status flags (e.g. `isConfigured`) rather than leaking secret strings.
 */

export interface AngelOneServerConfig {
  apiKey: string | null;
  clientCode: string | null;
  pin: string | null;
  totpSecret: string | null;
  baseUrl: string;
  wsUrl: string;
  scripMasterUrl: string;
  hasApiKey: boolean;
  hasClientCode: boolean;
  hasPin: boolean;
  hasTotpSecret: boolean;
  isConfigured: boolean;
}

export interface ServerMarketDataConfig {
  providerId: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasAccessToken: boolean;
  baseUrl: string | null;
  stalenessThresholdMs: number;
  timeoutMs: number;
  scripMasterCacheTtlMs: number;
  isConfigured: boolean;
  angelOne: AngelOneServerConfig;
}

const DEFAULT_ANGEL_ONE_BASE_URL = 'https://apiconnect.angelone.in';
const DEFAULT_ANGEL_ONE_WS_URL = 'wss://smartapisocket.angelone.in/smart-stream';
const DEFAULT_ANGEL_ONE_SCRIP_MASTER_URL =
  'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';

/**
 * Loads and inspects server-side environment variables securely.
 */
export function getServerMarketDataConfig(): ServerMarketDataConfig {
  // Read purely server-side variables (do not use NEXT_PUBLIC_ prefix)
  const rawProviderId = process.env.MARKET_DATA_PROVIDER?.trim() || null;
  const providerId = rawProviderId ? rawProviderId.toUpperCase() : null;

  // Generic provider variables
  const apiKey = process.env.MARKET_DATA_API_KEY?.trim() || null;
  const apiSecret = process.env.MARKET_DATA_API_SECRET?.trim() || null;
  const accessToken = process.env.MARKET_DATA_ACCESS_TOKEN?.trim() || null;
  const baseUrl = process.env.MARKET_DATA_BASE_URL?.trim() || null;

  // Angel One SmartAPI variables
  const aoApiKey = process.env.ANGEL_ONE_API_KEY?.trim() || null;
  const aoClientCode = process.env.ANGEL_ONE_CLIENT_CODE?.trim() || null;
  const aoPin = process.env.ANGEL_ONE_PIN?.trim() || null;
  const aoTotpSecret = process.env.ANGEL_ONE_TOTP_SECRET?.trim() || null;
  const aoBaseUrl = process.env.ANGEL_ONE_BASE_URL?.trim() || DEFAULT_ANGEL_ONE_BASE_URL;
  const aoWsUrl = process.env.ANGEL_ONE_WS_URL?.trim() || DEFAULT_ANGEL_ONE_WS_URL;
  const aoScripMasterUrl =
    process.env.ANGEL_ONE_SCRIP_MASTER_URL?.trim() || DEFAULT_ANGEL_ONE_SCRIP_MASTER_URL;

  const stalenessThresholdMs = Number(process.env.MARKET_DATA_STALENESS_THRESHOLD_MS) || 60000;
  const timeoutMs = Number(process.env.MARKET_DATA_TIMEOUT_MS) || 10000;
  const scripMasterCacheTtlMs =
    Number(process.env.INSTRUMENT_MASTER_CACHE_TTL_MS) || 86400000; // 24 hours

  // A provider is considered configured only if an identifier and at least one credential token is provided
  const hasApiKey = Boolean(apiKey && apiKey !== 'your_server_api_key_here');
  const hasApiSecret = Boolean(apiSecret && apiSecret !== 'your_server_api_secret_here');
  const hasAccessToken = Boolean(accessToken && accessToken !== 'your_server_access_token_here');

  // Angel One specific credential validation (must not match template placeholders)
  const hasAoApiKey = Boolean(aoApiKey && aoApiKey !== 'your_smartapi_api_key_here');
  const hasAoClientCode = Boolean(aoClientCode && aoClientCode !== 'your_client_code_here');
  const hasAoPin = Boolean(aoPin && aoPin !== 'your_account_pin_here');
  const hasAoTotpSecret = Boolean(aoTotpSecret && aoTotpSecret !== 'your_base32_totp_secret_here');

  const isAngelOneConfigured = Boolean(
    hasAoApiKey && hasAoClientCode && hasAoPin && hasAoTotpSecret
  );

  const isConfigured = Boolean(
    providerId &&
      providerId.length > 0 &&
      (providerId === 'ANGEL_ONE' ? isAngelOneConfigured : hasApiKey || hasAccessToken)
  );

  return {
    providerId,
    hasApiKey,
    hasApiSecret,
    hasAccessToken,
    baseUrl,
    stalenessThresholdMs,
    timeoutMs,
    scripMasterCacheTtlMs,
    isConfigured,
    angelOne: {
      apiKey: aoApiKey,
      clientCode: aoClientCode,
      pin: aoPin,
      totpSecret: aoTotpSecret,
      baseUrl: aoBaseUrl,
      wsUrl: aoWsUrl,
      scripMasterUrl: aoScripMasterUrl,
      hasApiKey: hasAoApiKey,
      hasClientCode: hasAoClientCode,
      hasPin: hasAoPin,
      hasTotpSecret: hasAoTotpSecret,
      isConfigured: isAngelOneConfigured,
    },
  };
}
