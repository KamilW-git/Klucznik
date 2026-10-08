import { registerAs } from '@nestjs/config';

import { parseEnv } from './env.schema';

/** Tokeny i ciasteczko sesji (docs/architecture/security.md). */
export const authConfig = registerAs('auth', () => {
  const env = parseEnv(process.env);
  return {
    jwtSecret: env.JWT_ACCESS_SECRET,
    /** Sekundy. */
    accessTokenTtl: env.JWT_ACCESS_TTL,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    cookieSecure: env.COOKIE_SECURE,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;

/** Globalny limit żądań (`@nestjs/throttler`); limity tras auth są w kontrolerze. */
export const throttleConfig = registerAs('throttle', () => {
  const env = parseEnv(process.env);
  return { ttlSeconds: env.THROTTLE_TTL, limit: env.THROTTLE_LIMIT };
});

export type ThrottleConfig = ReturnType<typeof throttleConfig>;
