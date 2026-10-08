import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';

import type { AuthUser } from '../../src/common/auth/auth-user';
import { TokenService } from '../../src/modules/auth/application/token.service';
import { REFRESH_COOKIE } from '../../src/modules/auth/http/refresh-cookie';

/**
 * Access token dla użytkownika bez logowania przez HTTP (docs/architecture/testing-strategy.md: `loginAs`).
 * Omija `/auth/login`, więc nie zużywa limitu żądań i nie hashuje haseł.
 */
export function accessTokenFor(app: INestApplication, user: AuthUser): string {
  return app.get(TokenService).issueAccessToken({ id: user.id, role: user.role }).accessToken;
}

export const bearer = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

/** Nagłówek `Set-Cookie` z ciasteczkiem refresh tokenu (albo `undefined`). */
export function refreshSetCookie(res: Response): string | undefined {
  const header = res.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`));
}

/** Wartość `kl_refresh=<token>` do wysłania w nagłówku `Cookie`. */
export function refreshCookie(res: Response): string {
  const cookie = refreshSetCookie(res);
  if (!cookie) {
    throw new Error('Response has no refresh cookie');
  }
  return cookie.split(';')[0]!;
}
