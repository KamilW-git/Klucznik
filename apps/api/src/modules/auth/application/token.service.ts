import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  type AccessTokenVerifier,
  type AuthUser,
  ROLES,
  type Role,
} from '../../../common/auth/auth-user';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { type AuthConfig, authConfig } from '../../../config/auth.config';

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IssuedAccessToken {
  accessToken: string;
  /** Sekundy. */
  expiresIn: number;
}

export interface IssuedRefreshToken {
  /** Surowy token: trafia wyłącznie do ciasteczka. */
  token: string;
  /** SHA-256 (hex): jedyna postać zapisywana w bazie. */
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Access token (JWT HS256) i refresh token (losowy, nieprzezroczysty), ADR 0004.
 * Czas (`iat`, `exp`, ważność refresh tokenu) pochodzi z `Clock`, więc testy z `FixedClock`
 * sprawdzają też wygasanie.
 */
@Injectable()
export class TokenService implements AccessTokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  issueAccessToken(user: AuthUser): IssuedAccessToken {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, iat },
      { expiresIn: this.config.accessTokenTtl },
    );
    return { accessToken, expiresIn: this.config.accessTokenTtl };
  }

  verify(token: string): AuthUser | null {
    let payload: unknown;
    try {
      payload = this.jwt.verify(token, {
        algorithms: ['HS256'],
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      });
    } catch {
      return null;
    }
    return toAuthUser(payload);
  }

  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(this.clock.now().getTime() + this.config.refreshTokenTtlDays * DAY_MS),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function toAuthUser(payload: unknown): AuthUser | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const { sub, role } = payload as { sub?: unknown; role?: unknown };
  if (typeof sub !== 'string' || !UUID.test(sub) || !ROLES.includes(role as Role)) {
    return null;
  }
  return { id: sub, role: role as Role };
}
