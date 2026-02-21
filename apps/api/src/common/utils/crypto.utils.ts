import * as crypto from 'node:crypto';

/**
 * Hashes a token using SHA-256 for secure storage.
 * @param token The raw token string.
 * @returns The hex-encoded SHA-256 hash of the token.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
