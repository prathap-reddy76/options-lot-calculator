import { getServerMarketDataConfig } from '../config';
import { MarketDataError } from '../errors';
import { generateTOTP } from './totp';

export interface AngelOneSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
}

export interface AngelOneAuthResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data?: {
    jwtToken: string;
    refreshToken: string;
    feedToken: string;
  };
}

/**
 * Standard client IP / MAC headers expected by SmartAPI gateway.
 */
export const DEFAULT_SMARTAPI_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-UserType': 'USER',
  'X-SourceID': 'WEB',
  'X-ClientLocalIP': '127.0.0.1',
  'X-ClientPublicIP': '106.193.147.98',
  'X-MACAddress': '00:1A:2B:3C:4D:5E',
};

/**
 * Parses JWT token to extract standard `exp` timestamp if present.
 */
function extractJwtExpiry(jwtToken: string): number | null {
  try {
    const parts = jwtToken.split('.');
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
    const parsed = JSON.parse(payloadJson);
    if (typeof parsed.exp === 'number') {
      return parsed.exp * 1000;
    }
  } catch {
    // Ignore and fallback to default TTL
  }
  return null;
}

/**
 * Server-side Singleton Session Manager for Angel One SmartAPI.
 */
export class AngelOneAuthManager {
  private activeSession: AngelOneSession | null = null;
  private pendingAuthPromise: Promise<AngelOneSession> | null = null;

  /**
   * Resets active session state (e.g. for testing or after forced logout).
   */
  public clearSession(): void {
    this.activeSession = null;
    this.pendingAuthPromise = null;
  }

  /**
   * Gets a valid authentication session, initiating login or token refresh if expired.
   */
  public async getSession(): Promise<AngelOneSession> {
    const config = getServerMarketDataConfig();
    const ao = config.angelOne;

    if (!ao.isConfigured || !ao.apiKey || !ao.clientCode || !ao.pin || !ao.totpSecret) {
      throw MarketDataError.notConfigured(
        'Angel One SmartAPI credentials are not fully configured. Please set ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_CODE, ANGEL_ONE_PIN, and ANGEL_ONE_TOTP_SECRET in .env.local.'
      );
    }

    const now = Date.now();
    // If we have an active session that is valid for at least another 2 minutes, reuse it
    if (this.activeSession && this.activeSession.expiresAt > now + 120000) {
      return this.activeSession;
    }

    // Deduplicate concurrent authentication requests
    if (this.pendingAuthPromise) {
      return await this.pendingAuthPromise;
    }

    this.pendingAuthPromise = this.performAuthentication()
      .then((session) => {
        this.activeSession = session;
        this.pendingAuthPromise = null;
        return session;
      })
      .catch((err) => {
        this.pendingAuthPromise = null;
        throw err;
      });

    return await this.pendingAuthPromise;
  }

  /**
   * Performs authentication via loginByPassword or token refresh.
   */
  private async performAuthentication(): Promise<AngelOneSession> {
    const config = getServerMarketDataConfig();
    const ao = config.angelOne;

    // If we have an existing session with a refreshToken, attempt refresh first
    if (this.activeSession?.refreshToken) {
      try {
        const refreshed = await this.refreshToken(this.activeSession);
        if (refreshed) {
          return refreshed;
        }
      } catch {
        // Token refresh failed; proceed to full loginByPassword
      }
    }

    // Generate dynamic 6-digit TOTP
    let totpCode: string;
    try {
      totpCode = generateTOTP(ao.totpSecret!);
    } catch (err: unknown) {
      throw new MarketDataError(
        'AUTHENTICATION_FAILED',
        `Failed to generate TOTP: ${err instanceof Error ? err.message : 'Invalid secret format'}`
      );
    }

    const loginUrl = `${ao.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`;
    const headers = {
      ...DEFAULT_SMARTAPI_HEADERS,
      'X-PrivateKey': ao.apiKey!,
    };

    const payload = {
      clientcode: ao.clientCode,
      password: ao.pin,
      totp: totpCode,
    };

    let response: Response;
    try {
      response = await fetch(loginUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (err: unknown) {
      throw MarketDataError.networkError(
        'Angel One SmartAPI',
        err instanceof Error ? err.message : 'Login connection failed.'
      );
    }

    if (!response.ok) {
      throw new MarketDataError(
        'AUTHENTICATION_FAILED',
        `Angel One authentication request rejected with HTTP ${response.status}. Verify server credentials.`
      );
    }

    const data: AngelOneAuthResponse = await response.json();

    if (!data.status || !data.data?.jwtToken) {
      const sanitizedMsg = data.message ? data.message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]') : 'Invalid credentials';
      throw new MarketDataError(
        'AUTHENTICATION_FAILED',
        `Angel One login failed: ${sanitizedMsg} (Code: ${data.errorcode || 'AUTH_FAIL'})`
      );
    }

    const rawJwt = data.data.jwtToken;
    const cleanJwt = rawJwt.startsWith('Bearer ') ? rawJwt.replace('Bearer ', '').trim() : rawJwt.trim();
    const expFromToken = extractJwtExpiry(cleanJwt);
    // Default TTL: 8 hours if exp claim not found
    const expiresAt = expFromToken || Date.now() + 8 * 60 * 60 * 1000;

    return {
      jwtToken: cleanJwt,
      refreshToken: data.data.refreshToken || '',
      feedToken: data.data.feedToken || '',
      expiresAt,
      createdAt: Date.now(),
    };
  }

  /**
   * Refreshes JWT token using refresh token.
   */
  private async refreshToken(existingSession: AngelOneSession): Promise<AngelOneSession | null> {
    const config = getServerMarketDataConfig();
    const ao = config.angelOne;
    if (!existingSession.refreshToken) return null;

    const refreshUrl = `${ao.baseUrl}/rest/auth/angelbroking/jwt/v1/generateTokens`;
    const headers = {
      ...DEFAULT_SMARTAPI_HEADERS,
      Authorization: `Bearer ${existingSession.jwtToken}`,
      'X-PrivateKey': ao.apiKey!,
    };

    const payload = {
      refreshToken: existingSession.refreshToken,
    };

    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) return null;

    const data: AngelOneAuthResponse = await response.json();
    if (!data.status || !data.data?.jwtToken) return null;

    const rawJwt = data.data.jwtToken;
    const cleanJwt = rawJwt.startsWith('Bearer ') ? rawJwt.replace('Bearer ', '').trim() : rawJwt.trim();
    const expFromToken = extractJwtExpiry(cleanJwt);
    const expiresAt = expFromToken || Date.now() + 8 * 60 * 60 * 1000;

    return {
      jwtToken: cleanJwt,
      refreshToken: data.data.refreshToken || existingSession.refreshToken,
      feedToken: data.data.feedToken || existingSession.feedToken,
      expiresAt,
      createdAt: Date.now(),
    };
  }
}

export const angelOneAuth = new AngelOneAuthManager();
