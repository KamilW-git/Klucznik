import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 tokenu gościa (hex), jedyna postać zapisywana w bazie (docs/architecture/security.md#token-gościa). */
export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Nowy token gościa: 32 losowe bajty w base64url i jego hash. */
export function generateGuestToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashGuestToken(token) };
}
