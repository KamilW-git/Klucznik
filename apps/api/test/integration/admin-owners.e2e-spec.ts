import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { User } from '../../src/infrastructure/prisma/generated/client';
import type { OwnerDto, OwnerPageDto } from '../../src/modules/users/http/dto';
import {
  createAdmin,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
} from '../factories';
import { accessTokenFor, bearer, refreshCookie } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const errorCode = (res: request.Response): string => (res.body as ErrorResponseDto).code;

describe('Admin: owners and properties', () => {
  let ctx: TestApp;
  let admin: User;
  let adminToken: string;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    admin = await createAdmin(ctx.prisma);
    adminToken = accessTokenFor(ctx.app, admin);
  });

  describe('authorization (BR-12)', () => {
    const endpoints: [string, string][] = [
      ['get', '/api/v1/admin/owners'],
      ['post', '/api/v1/admin/owners'],
      ['get', '/api/v1/admin/owners/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a'],
      ['patch', '/api/v1/admin/owners/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a'],
      ['delete', '/api/v1/admin/owners/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a'],
      ['get', '/api/v1/admin/properties'],
    ];

    it.each(endpoints)('BR-12: OWNER → %s %s → 403 FORBIDDEN', async (method, path) => {
      const owner = await createOwner(ctx.prisma);

      const res = await http()
        [method as 'get'](path)
        .set(bearer(accessTokenFor(ctx.app, owner)))
        .expect(403);

      expect(errorCode(res)).toBe('FORBIDDEN');
    });

    it.each(endpoints)('%s %s without a token → 401 UNAUTHORIZED', async (method, path) => {
      await http()[method as 'get'](path).expect(401);
    });
  });

  describe('POST /admin/owners', () => {
    const newOwner = {
      firstName: 'Ewa',
      lastName: 'Wiśniewska',
      email: 'Ewa.Wisniewska@Example.com',
      password: 'Tymczasowe-123',
    };

    it('creates an owner with a property; the owner can log in', async () => {
      const res = await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send({ ...newOwner, property: { name: 'Pensjonat Pod Lipami' } })
        .expect(201);
      const owner = res.body as OwnerDto;

      expect(res.headers.location).toBe(`/api/v1/admin/owners/${owner.id}`);
      expect(owner).toMatchObject({
        email: 'ewa.wisniewska@example.com',
        isActive: true,
        propertiesCount: 1,
        properties: [
          { name: 'Pensjonat Pod Lipami', slug: 'pensjonat-pod-lipami', isActive: true },
        ],
      });
      await http()
        .post('/api/v1/auth/login')
        .send({ email: newOwner.email, password: newOwner.password })
        .expect(200);
    });

    it('generates a unique slug with a suffix when the name is taken', async () => {
      const other = await createOwner(ctx.prisma);
      await createProperty(ctx.prisma, other, { name: 'Leśna Polana', slug: 'lesna-polana' });

      const res = await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send({ ...newOwner, property: { name: 'Leśna Polana' } })
        .expect(201);

      expect((res.body as OwnerDto).properties[0]?.slug).toBe('lesna-polana-2');
    });

    it('returns 409 SLUG_TAKEN for an explicit taken slug and creates nothing', async () => {
      const other = await createOwner(ctx.prisma);
      await createProperty(ctx.prisma, other, { slug: 'lesna-polana' });

      const res = await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send({ ...newOwner, property: { name: 'Cokolwiek', slug: 'lesna-polana' } })
        .expect(409);

      expect(errorCode(res)).toBe('SLUG_TAKEN');
      // Transakcja: właściciel nie powstał bez obiektu.
      await expect(
        ctx.prisma.user.count({ where: { email: 'ewa.wisniewska@example.com' } }),
      ).resolves.toBe(0);
    });

    it('returns 409 EMAIL_TAKEN for a duplicate e-mail (case-insensitive)', async () => {
      await createOwner(ctx.prisma, { email: 'ewa.wisniewska@example.com' });

      const res = await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send(newOwner)
        .expect(409);

      expect(errorCode(res)).toBe('EMAIL_TAKEN');
    });

    it('returns 400 for a too short password or an invalid slug', async () => {
      await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send({ ...newOwner, password: 'short' })
        .expect(400);
      await http()
        .post('/api/v1/admin/owners')
        .set(bearer(adminToken))
        .send({ ...newOwner, property: { name: 'X', slug: 'Zły Slug' } })
        .expect(400);
    });
  });

  describe('GET /admin/owners', () => {
    it('paginates, searches and counts properties and recent reservations', async () => {
      const jan = await createOwner(ctx.prisma, { firstName: 'Jan', lastName: 'Nowak' });
      await createOwner(ctx.prisma, { firstName: 'Ewa', lastName: 'Zielińska' });
      await createOwner(ctx.prisma, { firstName: 'Adam', lastName: 'Kowal' });
      const property = await createProperty(ctx.prisma, jan);
      await createProperty(ctx.prisma, jan);
      const room = await createRoom(ctx.prisma, property);
      const guest = await createGuest(ctx.prisma, property);
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
      });

      const page = await http()
        .get('/api/v1/admin/owners?page=1&pageSize=2&sort=lastName:asc')
        .set(bearer(adminToken))
        .expect(200);
      const search = await http()
        .get('/api/v1/admin/owners?q=NOWA')
        .set(bearer(adminToken))
        .expect(200);

      const body = page.body as OwnerPageDto;
      expect(body.meta).toEqual({ page: 1, pageSize: 2, totalItems: 3, totalPages: 2 });
      expect(body.data.map((o) => o.lastName)).toEqual(['Kowal', 'Nowak']);
      expect((search.body as OwnerPageDto).data).toEqual([
        expect.objectContaining({ id: jan.id, propertiesCount: 2, reservationsLast30Days: 1 }),
      ]);
    });

    it('does not list admins and rejects an unknown sort field', async () => {
      const res = await http().get('/api/v1/admin/owners').set(bearer(adminToken)).expect(200);

      expect((res.body as OwnerPageDto).data).toEqual([]);
      await http()
        .get('/api/v1/admin/owners?sort=passwordHash:asc')
        .set(bearer(adminToken))
        .expect(400);
    });
  });

  describe('GET, PATCH, DELETE /admin/owners/:id', () => {
    it('returns 404 for an unknown id and for an admin account', async () => {
      await http()
        .get('/api/v1/admin/owners/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a')
        .set(bearer(adminToken))
        .expect(404);
      await http().get(`/api/v1/admin/owners/${admin.id}`).set(bearer(adminToken)).expect(404);
      await http()
        .patch(`/api/v1/admin/owners/${admin.id}`)
        .set(bearer(adminToken))
        .send({ firstName: 'X' })
        .expect(404);
    });

    it('updates names and returns 409 EMAIL_TAKEN for another account e-mail', async () => {
      const owner = await createOwner(ctx.prisma);

      const res = await http()
        .patch(`/api/v1/admin/owners/${owner.id}`)
        .set(bearer(adminToken))
        .send({ firstName: 'Janusz' })
        .expect(200);
      const conflict = await http()
        .patch(`/api/v1/admin/owners/${owner.id}`)
        .set(bearer(adminToken))
        .send({ email: admin.email })
        .expect(409);

      expect((res.body as OwnerDto).firstName).toBe('Janusz');
      expect(errorCode(conflict)).toBe('EMAIL_TAKEN');
    });

    it('DELETE deactivates the owner: no login, no refresh (Q-10)', async () => {
      const owner = await createOwner(ctx.prisma);
      const session = await http()
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: 'Test-password-123' })
        .expect(200);

      await http().delete(`/api/v1/admin/owners/${owner.id}`).set(bearer(adminToken)).expect(204);

      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie(session)).expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: 'Test-password-123' })
        .expect(401);
      const res = await http()
        .get(`/api/v1/admin/owners/${owner.id}`)
        .set(bearer(adminToken))
        .expect(200);
      expect((res.body as OwnerDto).isActive).toBe(false);
    });
  });

  describe('GET /admin/properties', () => {
    it('lists properties of all owners with owner and rooms count, filtered by owner', async () => {
      const jan = await createOwner(ctx.prisma);
      const ewa = await createOwner(ctx.prisma);
      const janProperty = await createProperty(ctx.prisma, jan, { name: 'Leśna Polana' });
      await createProperty(ctx.prisma, ewa, { name: 'Pod Lipami' });
      await createRoom(ctx.prisma, janProperty);
      await createRoom(ctx.prisma, janProperty);

      const all = await http().get('/api/v1/admin/properties').set(bearer(adminToken)).expect(200);
      const filtered = await http()
        .get(`/api/v1/admin/properties?ownerId=${jan.id}&q=le`)
        .set(bearer(adminToken))
        .expect(200);

      expect((all.body as { meta: { totalItems: number } }).meta.totalItems).toBe(2);
      expect((filtered.body as { data: unknown[] }).data).toEqual([
        expect.objectContaining({
          id: janProperty.id,
          roomsCount: 2,
          owner: expect.objectContaining({ id: jan.id, email: jan.email }) as unknown,
        }),
      ]);
    });
  });
});
