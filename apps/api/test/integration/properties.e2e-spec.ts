import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { Property, Room, User } from '../../src/infrastructure/prisma/generated/client';
import type {
  DashboardDto,
  PropertyDto,
  PropertyListDto,
} from '../../src/modules/properties/http/property.dto';
import {
  createAdmin,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const errorCode = (res: request.Response): string => (res.body as ErrorResponseDto).code;

const newProperty = {
  name: 'Zielona Zagroda',
  street: 'Polna 1',
  postalCode: '11-730',
  city: 'Mikołajki',
};

// „Dziś” = 2026-08-01 (TEST_NOW w strefie Europe/Warsaw).
describe('Properties (/api/v1/properties)', () => {
  let ctx: TestApp;
  let owner: User;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    owner = await createOwner(ctx.prisma);
    token = accessTokenFor(ctx.app, owner);
  });

  describe('POST /properties', () => {
    it('creates a property for the owner with a generated slug and defaults', async () => {
      const res = await http()
        .post('/api/v1/properties')
        .set(bearer(token))
        .send(newProperty)
        .expect(201);
      const property = res.body as PropertyDto;

      expect(res.headers.location).toBe(`/api/v1/properties/${property.id}`);
      expect(property).toMatchObject({
        ownerId: owner.id,
        slug: 'zielona-zagroda',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationDeadlineDays: 7,
        pendingExpiryHours: 48,
        currency: 'PLN',
        isActive: true,
        coverPhoto: null,
        photos: [],
        publicUrl: 'http://localhost:8080/o/zielona-zagroda',
      });
    });

    it('requires the address and validates formats (400)', async () => {
      const res = await http()
        .post('/api/v1/properties')
        .set(bearer(token))
        .send({ name: 'Bez adresu', postalCode: '11730', checkInTime: '25:00' })
        .expect(400);

      const fields = (res.body as ErrorResponseDto & { details: { fields: { field: string }[] } })
        .details.fields;
      expect(fields.map((f) => f.field)).toEqual(
        expect.arrayContaining(['street', 'postalCode', 'city', 'checkInTime']),
      );
    });

    it('returns 409 SLUG_TAKEN for an explicit slug in use', async () => {
      await createProperty(ctx.prisma, owner, { slug: 'zielona-zagroda' });

      const res = await http()
        .post('/api/v1/properties')
        .set(bearer(token))
        .send({ ...newProperty, slug: 'zielona-zagroda' })
        .expect(409);

      expect(errorCode(res)).toBe('SLUG_TAKEN');
    });

    it('ADMIN must name the owner; OWNER cannot create for someone else', async () => {
      const admin = await createAdmin(ctx.prisma);
      const adminToken = accessTokenFor(ctx.app, admin);
      const other = await createOwner(ctx.prisma);

      await http().post('/api/v1/properties').set(bearer(adminToken)).send(newProperty).expect(400);
      const created = await http()
        .post('/api/v1/properties')
        .set(bearer(adminToken))
        .send({ ...newProperty, ownerId: other.id })
        .expect(201);
      await http()
        .post('/api/v1/properties')
        .set(bearer(adminToken))
        .send({ ...newProperty, ownerId: admin.id })
        .expect(404);
      await http()
        .post('/api/v1/properties')
        .set(bearer(token))
        .send({ ...newProperty, ownerId: other.id })
        .expect(403);

      expect((created.body as PropertyDto).ownerId).toBe(other.id);
    });
  });

  describe('PATCH /properties/:id', () => {
    it('updates settings and the slug', async () => {
      const property = await createProperty(ctx.prisma, owner);

      const res = await http()
        .patch(`/api/v1/properties/${property.id}`)
        .set(bearer(token))
        .send({
          slug: 'nowy-adres',
          cancellationDeadlineDays: 14,
          phone: null,
          checkInTime: '14:00',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        slug: 'nowy-adres',
        cancellationDeadlineDays: 14,
        phone: null,
        checkInTime: '14:00',
      });
    });

    it('rejects unknown fields such as ownerId (400)', async () => {
      const property = await createProperty(ctx.prisma, owner);

      await http()
        .patch(`/api/v1/properties/${property.id}`)
        .set(bearer(token))
        .send({ ownerId: owner.id })
        .expect(400);
    });
  });

  describe('BR-10: delete and deactivate', () => {
    let property: Property;
    let room: Room;

    beforeEach(async () => {
      property = await createProperty(ctx.prisma, owner);
      room = await createRoom(ctx.prisma, property);
    });

    const reserve = async (
      checkIn: string,
      checkOut: string,
      status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED',
    ) =>
      createReservation(ctx.prisma, {
        room,
        guest: await createGuest(ctx.prisma, property),
        checkIn,
        checkOut,
        status,
      });

    it('BR-10: returns 409 HAS_FUTURE_RESERVATIONS for DELETE with a future reservation', async () => {
      await reserve('2026-08-10', '2026-08-12', 'PENDING');

      const res = await http()
        .delete(`/api/v1/properties/${property.id}`)
        .set(bearer(token))
        .expect(409);

      expect(res.body).toMatchObject({ code: 'HAS_FUTURE_RESERVATIONS', details: { count: 1 } });
    });

    it('BR-10: a stay ending today does not block (checkOut > today is required)', async () => {
      await reserve('2026-07-28', '2026-08-01', 'CONFIRMED');
      await reserve('2026-08-10', '2026-08-12', 'CANCELLED');

      await http().delete(`/api/v1/properties/${property.id}`).set(bearer(token)).expect(204);
    });

    it('BR-10: soft-deleted property disappears from lists and returns 404, but stays in the database', async () => {
      await http().delete(`/api/v1/properties/${property.id}`).set(bearer(token)).expect(204);

      const list = await http().get('/api/v1/properties').set(bearer(token)).expect(200);
      expect((list.body as PropertyListDto).data).toEqual([]);
      await http().get(`/api/v1/properties/${property.id}`).set(bearer(token)).expect(404);
      await http().get(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(404);
      await expect(ctx.prisma.property.count({ where: { id: property.id } })).resolves.toBe(1);
    });

    it('BR-10: PATCH isActive=false with a future reservation → 409, other changes allowed', async () => {
      await reserve('2026-08-10', '2026-08-12', 'CONFIRMED');

      await http()
        .patch(`/api/v1/properties/${property.id}`)
        .set(bearer(token))
        .send({ isActive: false })
        .expect(409);
      await http()
        .patch(`/api/v1/properties/${property.id}`)
        .set(bearer(token))
        .send({ name: 'Nowa nazwa' })
        .expect(200);
    });
  });

  describe('GET /properties/:id/dashboard', () => {
    it('computes today counters, occupancy and lists for a fixed "today"', async () => {
      const property = await createProperty(ctx.prisma, owner);
      const r1 = await createRoom(ctx.prisma, property, { name: 'R1' });
      const r2 = await createRoom(ctx.prisma, property, { name: 'R2' });
      const hidden = await createRoom(ctx.prisma, property, { name: 'R3', isActive: false });
      const guest = await createGuest(ctx.prisma, property);
      const reserve = (
        room: Room,
        checkIn: string,
        checkOut: string,
        status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED',
      ) => createReservation(ctx.prisma, { room, guest, checkIn, checkOut, status });

      const arrival = await reserve(r1, '2026-08-01', '2026-08-04', 'CONFIRMED'); // przyjazd dziś, 3 noce w sierpniu
      await reserve(r2, '2026-07-29', '2026-08-01', 'CONFIRMED'); // wyjazd dziś, 0 nocy w sierpniu
      const pendingA = await reserve(r2, '2026-08-10', '2026-08-12', 'PENDING');
      const pendingB = await reserve(r1, '2026-08-20', '2026-08-22', 'PENDING');
      const soon = await reserve(r2, '2026-08-05', '2026-08-08', 'CONFIRMED'); // 3 noce w sierpniu
      await reserve(r1, '2026-07-25', '2026-07-28', 'COMPLETED');
      const hiddenStay = await reserve(hidden, '2026-08-02', '2026-08-04', 'CONFIRMED'); // pokój nieaktywny
      await reserve(r2, '2026-08-01', '2026-08-03', 'CANCELLED');

      const res = await http()
        .get(`/api/v1/properties/${property.id}/dashboard`)
        .set(bearer(token))
        .expect(200);
      const dashboard = res.body as DashboardDto;

      expect(dashboard).toMatchObject({
        arrivalsToday: 1,
        departuresToday: 1,
        pendingCount: 2,
        // 6 nocy / (2 aktywne pokoje × 31 dni) = 9,7% → 10
        occupancyThisMonth: 10,
      });
      expect(dashboard.pendingReservations.map((r) => r.id).sort()).toEqual(
        [pendingA.id, pendingB.id].sort(),
      );
      expect(dashboard.upcomingArrivals.map((r) => r.id)).toEqual([
        arrival.id,
        hiddenStay.id,
        soon.id,
      ]);
      expect(dashboard.upcomingArrivals[0]).toMatchObject({
        checkIn: '2026-08-01',
        checkOut: '2026-08-04',
        nights: 3,
        room: { id: r1.id, name: 'R1' },
        guest: { id: guest.id },
      });
      expect(dashboard.occupancyNext30Days).toHaveLength(30);
      expect(dashboard.occupancyNext30Days.slice(0, 6)).toEqual([
        { date: '2026-08-01', occupiedRooms: 1, totalRooms: 2 },
        { date: '2026-08-02', occupiedRooms: 1, totalRooms: 2 },
        { date: '2026-08-03', occupiedRooms: 1, totalRooms: 2 },
        { date: '2026-08-04', occupiedRooms: 0, totalRooms: 2 },
        { date: '2026-08-05', occupiedRooms: 1, totalRooms: 2 },
        { date: '2026-08-06', occupiedRooms: 1, totalRooms: 2 },
      ]);
    });

    it('returns zeros for a property without rooms', async () => {
      const property = await createProperty(ctx.prisma, owner);

      const res = await http()
        .get(`/api/v1/properties/${property.id}/dashboard`)
        .set(bearer(token))
        .expect(200);

      expect(res.body).toMatchObject({
        occupancyThisMonth: 0,
        pendingReservations: [],
        upcomingArrivals: [],
      });
    });
  });
});
