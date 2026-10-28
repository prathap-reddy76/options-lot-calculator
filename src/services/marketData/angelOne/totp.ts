import crypto from 'crypto';

/**
 * Base32 character set per RFC 4648.
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 encoded string into a Buffer.
 */
export function base32Decode(base32Str: string): Buffer {
  const sanitized = base32Str.toUpperCase().replace(/[\s\-_=]/g, '');
  const length = sanitized.length;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < length; i++) {
    const char = sanitized.charAt(i);
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character encountered: "${char}"`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 compliant Time-based One-Time Password (TOTP).
 *
 * @param secret - Base32 encoded secret key (e.g. from Angel One TOTP QR setup)
 * @param timestampMs - Optional timestamp in milliseconds (defaults to Date.now())
 * @param timeStepSeconds - Time step interval in seconds (standard default: 30)
 * @param digits - Length of generated OTP (standard default: 6)
 * @returns Formatted 6-digit TOTP string
 */
export function generateTOTP(
  secret: string,
  timestampMs: number = Date.now(),
  timeStepSeconds: number = 30,
  digits: number = 6
): string {
  if (!secret || secret.trim() === '') {
    throw new Error('TOTP secret key is required.');
  }

  const keyBuffer = base32Decode(secret.trim());
  const timeStep = Math.floor(timestampMs / 1000 / timeStepSeconds);

  // Convert time counter to 8-byte big-endian buffer
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(timeStep), 0);

  // Compute HMAC-SHA1
  const hmac = crypto.createHmac('sha1', keyBuffer);
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation (RFC 4226 section 5.4)
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binaryCode =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = binaryCode % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}
