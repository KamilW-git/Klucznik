import { JwtService } from '@nestjs/jwt';

import { FixedClock } from '../../../common/domain/clock';
import type { AuthConfig } from '../../../config/auth.config';
import { TokenService } from './token.service';

const SECRET = 'unit-test-secret-with-at-least-32-characters';
const USER = { id: '6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a', role: 'OWNER' as const };

const config: AuthConfig = {
  jwtSecret: SECRET,
  accessTokenTtl: 900,
  refreshTokenTtlDays: 7,
  cookieSecure: false,
};

function setup(secret = SECRET): { tokens: TokenService; clock: FixedClock; jwt: JwtService } {
  const clock = FixedClock.at('2026-08-01T10:00:00Z');
  const jwt = new JwtService({ secret, signOptions: { algorithm: 'HS256' } });
  return { tokens: new TokenService(jwt, clock, config), clock, jwt };
}

describe('TokenService', () => {
  describe('access token', () => {
    it('round-trips user id and role', () => {
      const { tokens } = setup();
      const { accessToken, expiresIn } = tokens.issueAccessToken(USER);

      expect(expiresIn).toBe(900);
      expect(tokens.verify(accessToken)).toEqual(USER);
    });

    it('uses the clock for iat and exp', () => {
      const { tokens, jwt } = setup();
      const payload = jwt.decode<{ iat: number; exp: number }>(
        tokens.issueAccessToken(USER).accessToken,
      );

      expect(payload.iat).toBe(Date.parse('2026-08-01T10:00:00Z') / 1000);
      expect(payload.exp - payload.iat).toBe(900);
    });

    it('accepts a token until it expires and rejects it afterwards', () => {
      const { tokens, clock } = setup();
      const { accessToken } = tokens.issueAccessToken(USER);

      clock.advanceBy(899_000);
      expect(tokens.verify(accessToken)).toEqual(USER);
      clock.advanceBy(1_000);
      expect(tokens.verify(accessToken)).toBeNull();
    });

    it('rejects a token signed with another secret (forged)', () => {
      const forged = setup('another-secret-with-at-least-32-characters!').tokens.issueAccessToken(
        USER,
      );

      expect(setup().tokens.verify(forged.accessToken)).toBeNull();
    });

    it('rejects a tampered payload', () => {
      const { tokens } = setup();
      const [header, , signature] = tokens.issueAccessToken(USER).accessToken.split('.');
      const payload = Buffer.from(JSON.stringify({ sub: USER.id, role: 'ADMIN', iat: 1 })).toString(
        'base64url',
      );

      expect(tokens.verify(`${header}.${payload}.${signature}`)).toBeNull();
    });

    it('rejects tokens with an unexpected payload or algorithm', () => {
      const { tokens, jwt } = setup();
      const iat = Date.parse('2026-08-01T10:00:00Z') / 1000;

      expect(tokens.verify(jwt.sign({ sub: USER.id, role: 'GUEST', iat }))).toBeNull();
      expect(tokens.verify(jwt.sign({ sub: 'not-a-uuid', role: 'OWNER', iat }))).toBeNull();
      expect(
        tokens.verify(jwt.sign({ sub: USER.id, role: 'OWNER', iat }, { algorithm: 'HS512' })),
      ).toBeNull();
      expect(tokens.verify('garbage')).toBeNull();
    });
  });

  describe('refresh token', () => {
    it('is random, opaque and stored only as SHA-256', () => {
      const { tokens } = setup();
      const a = tokens.issueRefreshToken();
      const b = tokens.issueRefreshToken();

      expect(a.token).not.toBe(b.token);
      expect(a.token).toMatch(/^[\w-]{43}$/); // 32 bajty w base64url
      expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens.hashRefreshToken(a.token)).toBe(a.tokenHash);
    });

    it('expires after REFRESH_TOKEN_TTL_DAYS', () => {
      expect(setup().tokens.issueRefreshToken().expiresAt.toISOString()).toBe(
        '2026-08-08T10:00:00.000Z',
      );
    });
  });
});
