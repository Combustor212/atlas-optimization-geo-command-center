/**
 * Sanitize sensitive fields from objects before rendering
 */

const SENSITIVE_FIELDS = [
  'passwordHash',
  'password_hash',
  'refreshTokenHash',
  'refresh_token_hash',
  'secretKeyEncrypted',
  'secret_key_encrypted',
  'webhookSecretEncrypted',
  'webhook_secret_encrypted',
  'encryptedKey',
  'encrypted_key',
  'apiKey',
  'api_key',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
];

/**
 * Remove sensitive fields from an object
 */
export function sanitize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if field is sensitive
      if (SENSITIVE_FIELDS.includes(key) || key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Convert object to safe JSON string
 */
export function toSafeJson(obj: any, pretty = true): string {
  const sanitized = sanitize(obj);
  return JSON.stringify(sanitized, null, pretty ? 2 : 0);
}

/**
 * Prettify JSON for HTML display
 */
export function prettyJson(obj: any): string {
  return toSafeJson(obj, true);
}



