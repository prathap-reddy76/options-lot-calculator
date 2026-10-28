import { MarketDataErrorCode, MarketDataErrorDetail } from '@/types/api';

/**
 * Standard typed application error for all market-data operations.
 */
export class MarketDataError extends Error {
  public readonly code: MarketDataErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    code: MarketDataErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MarketDataError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MarketDataError);
    }
  }

  public toDetail(): MarketDataErrorDetail {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  public static notConfigured(message?: string): MarketDataError {
    return new MarketDataError(
      'PROVIDER_NOT_CONFIGURED',
      message ||
        'No market data provider is configured. The application is operating in 100% manual calculation mode.'
    );
  }

  public static invalidInstrument(symbol: string, exchange?: string): MarketDataError {
    return new MarketDataError(
      'INVALID_INSTRUMENT',
      `The instrument "${symbol}" is invalid or not traded on ${exchange || 'the specified exchange'}.`,
      { symbol, exchange }
    );
  }

  public static expiredContract(expiryDate: string): MarketDataError {
    return new MarketDataError(
      'CONTRACT_EXPIRED',
      `The contract with expiry date ${expiryDate} has already expired.`,
      { expiryDate }
    );
  }

  public static authenticationFailed(provider: string): MarketDataError {
    return new MarketDataError(
      'AUTHENTICATION_FAILED',
      `Authentication failed with provider "${provider}". Please verify server-side credentials.`,
      { provider }
    );
  }

  public static rateLimitExceeded(provider: string, retryAfterSeconds?: number): MarketDataError {
    return new MarketDataError(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded for provider "${provider}". Please retry after cooldown.`,
      { provider, retryAfterSeconds }
    );
  }

  public static networkError(provider: string, underlyingError?: string): MarketDataError {
    return new MarketDataError(
      'NETWORK_ERROR',
      `Network communication failed while connecting to "${provider}".`,
      { provider, underlyingError }
    );
  }

  public static staleQuote(symbol: string, timestamp: string): MarketDataError {
    return new MarketDataError(
      'STALE_QUOTE',
      `Quote for "${symbol}" from timestamp ${timestamp} exceeds maximum freshness threshold.`,
      { symbol, timestamp }
    );
  }

  public static unsupportedInstrument(symbol: string): MarketDataError {
    return new MarketDataError(
      'UNSUPPORTED_INSTRUMENT',
      `Derivatives for "${symbol}" are not supported by the configured provider adapter.`,
      { symbol }
    );
  }
}
