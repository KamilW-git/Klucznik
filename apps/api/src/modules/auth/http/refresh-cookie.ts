import type { CookieOptions, Response } from 'express';

import { API_PREFIX } from '../../../app.setup';

/** Ciasteczko refresh tokenu (docs/architecture/security.md#refresh-token). */
export const REFRESH_COOKIE = 'kl_refresh';

const baseOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: 'strict',
  // Wysyłane tylko do /api/v1/auth/* (ochrona przed CSRF razem z SameSite=Strict).
  path: `/${API_PREFIX}/auth`,
});

export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(secure), expires: expiresAt });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(secure));
}

export function readRefreshCookie(cookies: unknown): string | undefined {
  const value = (cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
