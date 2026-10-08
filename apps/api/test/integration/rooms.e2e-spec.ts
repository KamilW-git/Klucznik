import request from 'supertest';

import type { Property, User } from '../../src/infrastructure/prisma/generated/client';
import type { RoomDto, RoomListDto } from '../../src/modules/rooms/http/room.dto';
import {
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const newRoom = { name: 'Domek Sosna', capacity: 4, basePricePerNight: 37000 };

// „Dziś” = 2026-08-01.
describe('Rooms', () => {
  let ctx: TestApp;
  let owner: User;
  let property: Property;
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
    property = await createProperty(ctx.prisma, owner);
    token = accessTokenFor(ctx.app, owner);
  });

  it('creates a room (201 + Location) with defaults', async () => {
    const res = await http()
      .post(`/api/v1/properties/${property.id}/rooms`)
      .set(bearer(token))
      .send(newRoom)
      .expect(201);
    const room = res.body as RoomDto;

    expect(res.headers.location).toBe(`/api/v1/rooms/${room.id}`);
    expect(room).toMatchObject({
      ...newRoom,
      propertyId: property.id,
      minNights: 1,
      isActive: true,
      currency: 'PLN',
      description: null,
      coverPhoto: null,
      photos: [],
      upcomingReservationsCount: 0,
    });
  });

  it('validates capacity, price and minNights ranges (400)', async () => {
    await http()
      .post(`/api/v1/properties/${property.id}/rooms`)
      .set(bearer(token))
      .send({ name: 'X', capacity: 0, basePricePerNight: -1, minNights: 31 })
      .expect(400);
    await http()
      .post(`/api/v1/properties/${property.id}/rooms`)
      .set(bearer(token))
      .send({ ...newRoom, basePricePerNight: 370.5 })
      .expect(400);
  });

  it('lists rooms sorted by name, optionally without inactive ones', async () => {
    await createRoom(ctx.prisma, property, { name: 'Pokój Jeziorny' });
    await createRoom(ctx.prisma, property, { name: 'Apartament Pod Dębem', isActive: false });
    await createRoom(ctx.prisma, property, { name: 'Domek Brzoza' });

    const all = await http()
      .get(`/api/v1/properties/${property.id}/rooms`)
      .set(bearer(token))
      .expect(200);
    const active = await http()
      .get(`/api/v1/properties/${property.id}/rooms?includeInactive=false`)
      .set(bearer(token))
      .expect(200);

    expect((all.body as RoomListDto).data.map((r) => r.name)).toEqual([
      'Apartament Pod Dębem',
      'Domek Brzoza',
      'Pokój Jeziorny',
    ]);
    expect((active.body as RoomListDto).data.map((r) => r.name)).toEqual([
      'Domek Brzoza',
      'Pokój Jeziorny',
    ]);
  });

  it('counts upcoming active reservations per room', async () => {
    const room = await createRoom(ctx.prisma, property);
    const guest = await createGuest(ctx.prisma, property);
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-10',
      checkOut: '2026-08-12',
      status: 'PENDING',
    });
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-20',
      checkOut: '2026-08-22',
    });
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-07-20',
      checkOut: '2026-07-22',
    });
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-09-01',
      checkOut: '2026-09-02',
      status: 'CANCELLED',
    });

    const res = await http().get(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(200);

    expect((res.body as RoomDto).upcomingReservationsCount).toBe(2);
  });

  it('updates a room; a new base price does not change existing reservations (BR-05)', async () => {
    const room = await createRoom(ctx.prisma, property);
    const reservation = await createReservation(ctx.prisma, {
      room,
      guest: await createGuest(ctx.prisma, property),
      checkIn: '2026-08-10',
      checkOut: '2026-08-12',
    });

    const res = await http()
      .patch(`/api/v1/rooms/${room.id}`)
      .set(bearer(token))
      .send({ basePricePerNight: 50000, description: 'Odnowiony' })
      .expect(200);

    expect(res.body).toMatchObject({ basePricePerNight: 50000, description: 'Odnowiony' });
    await expect(
      ctx.prisma.reservation.findUnique({ where: { id: reservation.id } }),
    ).resolves.toMatchObject({
      totalPrice: reservation.totalPrice,
    });
  });

  describe('BR-10', () => {
    it('BR-10: DELETE and PATCH isActive=false with a future reservation → 409', async () => {
      const room = await createRoom(ctx.prisma, property);
      await createReservation(ctx.prisma, {
        room,
        guest: await createGuest(ctx.prisma, property),
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
      });

      const del = await http().delete(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(409);
      const hide = await http()
        .patch(`/api/v1/rooms/${room.id}`)
        .set(bearer(token))
        .send({ isActive: false })
        .expect(409);

      expect(del.body).toMatchObject({ code: 'HAS_FUTURE_RESERVATIONS', details: { count: 1 } });
      expect(hide.body).toMatchObject({ code: 'HAS_FUTURE_RESERVATIONS' });
    });

    it('BR-10: DELETE without future reservations → 204; the room disappears but history stays', async () => {
      const room = await createRoom(ctx.prisma, property);
      const past = await createReservation(ctx.prisma, {
        room,
        guest: await createGuest(ctx.prisma, property),
        checkIn: '2026-07-10',
        checkOut: '2026-07-12',
        status: 'COMPLETED',
      });

      await http().delete(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(204);

      await http().get(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(404);
      const list = await http()
        .get(`/api/v1/properties/${property.id}/rooms`)
        .set(bearer(token))
        .expect(200);
      expect((list.body as RoomListDto).data).toEqual([]);
      await expect(ctx.prisma.reservation.count({ where: { id: past.id } })).resolves.toBe(1);
    });
  });
});
