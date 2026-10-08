import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { User } from '../../src/infrastructure/prisma/generated/client';
import type { AuthResponseDto } from '../../src/modules/auth/http/dto';
import { createAdmin, createOwner, TEST_PASSWORD } from '../factories';
import { accessTokenFor, bearer, refreshCookie, refreshSetCookie } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const errorCode = (res: request.Response): string => (res.body as ErrorResponseDto).code;
const auth = (res: request.Response): AuthResponseDto => res.body as AuthResponseDto;

describe('Auth (/api/v1/auth)', () => {
  let ctx: TestApp;
  let owner: User;
  const http = () => request(ctx.app.getHttpServer());
  const login = (email: string, password = TEST_PASSWORD) =>
    http().post('/api/v1/auth/login').send({ email, password });

  // Każdy test dostaje świeżą aplikację, więc limit 5 logowań/min liczy się osobno.
  beforeEach(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    owner = await createOwner(ctx.prisma, { email: 'jan.nowak@test.klucznik.local' });
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  describe('POST /login', () => {
    it('returns an access token, the user and an HttpOnly refresh cookie', async () => {
      const res = await login('Jan.Nowak@Test.Klucznik.Local').expect(200);

      expect(auth(res)).toMatchObject({
        accessToken: expect.any(String) as unknown,
        expiresIn: 900,
        user: { id: owner.id, email: owner.email, role: 'OWNER' },
      });
      const cookie = refreshSetCookie(res);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
      expect(cookie).not.toMatch(/Secure/i); // COOKIE_SECURE=false w testach
    });

    it.each([
      ['wrong password', 'jan.nowak@test.klucznik.local', 'Wrong-password-1'],
      ['unknown e-mail', 'nobody@test.klucznik.local', TEST_PASSWORD],
    ])('returns 401 INVALID_CREDENTIALS for %s', async (_, email, password) => {
      const res = await login(email, password).expect(401);

      expect(errorCode(res)).toBe('INVALID_CREDENTIALS');
      expect(refreshSetCookie(res)).toBeUndefined();
    });

    it('returns 401 INVALID_CREDENTIALS for a deactivated account', async () => {
      await ctx.prisma.user.update({ where: { id: owner.id }, data: { isActive: false } });

      expect(errorCode(await login(owner.email).expect(401))).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 VALIDATION_ERROR for a malformed body', async () => {
      const res = await http().post('/api/v1/auth/login').send({ email: 'nope' }).expect(400);

      expect(errorCode(res)).toBe('VALIDATION_ERROR');
    });

    it('returns 429 RATE_LIMITED after 5 attempts per minute', async () => {
      for (let i = 0; i < 5; i++) {
        await login(owner.email, 'Wrong-password-1').expect(401);
      }

      expect(errorCode(await login(owner.email).expect(429))).toBe('RATE_LIMITED');
    });
  });

  describe('POST /refresh', () => {
    it('rotates the refresh token and returns a new access token', async () => {
      const first = await login(owner.email).expect(200);

      const res = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie(first))
        .expect(200);

      expect(auth(res).user.id).toBe(owner.id);
      expect(refreshCookie(res)).not.toBe(refreshCookie(first));
    });

    it('detects reuse of a rotated token and revokes all sessions of the user', async () => {
      const first = await login(owner.email).expect(200);
      const rotated = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie(first))
        .expect(200);

      const reuse = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie(first))
        .expect(401);

      expect(errorCode(reuse)).toBe('UNAUTHORIZED');
      expect(refreshSetCookie(reuse)).toMatch(/kl_refresh=;/); // ciasteczko wyczyszczone
      // Także token wydany przy rotacji przestaje działać (prawdopodobna kradzież).
      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(rotated)).expect(401);
      await expect(
        ctx.prisma.refreshToken.count({ where: { userId: owner.id, revokedAt: null } }),
      ).resolves.toBe(0);
    });

    it('returns 401 without a cookie or with an unknown token', async () => {
      await http().post('/api/v1/auth/refresh').expect(401);
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'kl_refresh=unknown-token')
        .expect(401);
    });

    it('returns 401 after the refresh token expires', async () => {
      const first = await login(owner.email).expect(200);
      ctx.clock.advanceBy(7 * 86_400_000);

      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(first)).expect(401);
    });

    it('returns 401 when the account was deactivated', async () => {
      const first = await login(owner.email).expect(200);
      await ctx.prisma.user.update({ where: { id: owner.id }, data: { isActive: false } });

      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(first)).expect(401);
    });
  });

  describe('POST /logout', () => {
    it('revokes the refresh token and clears the cookie', async () => {
      const first = await login(owner.email).expect(200);

      const res = await http()
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshCookie(first))
        .expect(204);

      expect(refreshSetCookie(res)).toMatch(/kl_refresh=;/);
      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(first)).expect(401);
    });

    it('is idempotent without a cookie', async () => {
      await http().post('/api/v1/auth/logout').expect(204);
    });
  });

  describe('GET /me', () => {
    it('returns the current user for a valid access token', async () => {
      const admin = await createAdmin(ctx.prisma);

      const res = await http()
        .get('/api/v1/auth/me')
        .set(bearer(accessTokenFor(ctx.app, admin)))
        .expect(200);

      expect(res.body).toEqual({
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'ADMIN',
      });
    });

    it('accepts the access token returned by /login', async () => {
      const { accessToken } = auth(await login(owner.email).expect(200));

      await http().get('/api/v1/auth/me').set(bearer(accessToken)).expect(200);
    });

    it.each([
      ['no token', {}],
      ['a malformed header', { Authorization: 'Token abc' }],
      ['a forged token', bearer('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl')],
    ])('returns 401 UNAUTHORIZED with %s', async (_, headers: Record<string, string>) => {
      const res = await http().get('/api/v1/auth/me').set(headers).expect(401);

      expect(errorCode(res)).toBe('UNAUTHORIZED');
    });

    it('returns 401 once the access token expires (15 min)', async () => {
      const token = accessTokenFor(ctx.app, owner);
      ctx.clock.advanceBy(15 * 60_000);

      await http().get('/api/v1/auth/me').set(bearer(token)).expect(401);
    });
  });
});
