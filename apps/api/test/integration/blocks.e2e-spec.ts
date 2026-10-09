import request from 'supertest';

import type { Guest, Room } from '../../src/infrastructure/prisma/generated/client';
import type {
  AvailabilityBlockDto,
  AvailabilityBlockListDto,
} from '../../src/modules/availability/http/block.dto';
import {
  createBlock,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

// „Dziś” = 2026-08-01.
describe('Availability blocks', () => {
  let ctx: TestApp;
  let room: Room;
  let guest: Guest;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const block = (dateFrom: string, dateTo: string, reason?: string | null) =>
    http()
      .post(`/api/v1/rooms/${room.id}/blocks`)
      .set(bearer(token))
      .send({ dateFrom, dateTo, reason });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    const owner = await createOwner(ctx.prisma);
    const property = await createProperty(ctx.prisma, owner);
    room = await createRoom(ctx.prisma, property);
    guest = await createGuest(ctx.prisma, property);
    token = accessTokenFor(ctx.app, owner);
  });

  it('creates a block (201 + Location), lists and deletes it', async () => {
    const res = await block('2026-08-20', '2026-08-22', 'Remont').expect(201);
    const created = res.body as AvailabilityBlockDto;

    expect(res.headers.location).toBe(`/api/v1/blocks/${created.id}`);
    expect(created).toMatchObject({
      roomId: room.id,
      dateFrom: '2026-08-20',
      dateTo: '2026-08-22',
      reason: 'Remont',
    });

    const list = await http().get(`/api/v1/rooms/${room.id}/blocks`).set(bearer(token)).expect(200);
    expect((list.body as AvailabilityBlockListDto).data.map((b) => b.id)).toEqual([created.id]);

    await http().delete(`/api/v1/blocks/${created.id}`).set(bearer(token)).expect(204);
    await http().delete(`/api/v1/blocks/${created.id}`).set(bearer(token)).expect(404);
  });

  it('filters the list by intersection with [from, to]', async () => {
    await createBlock(ctx.prisma, room, { dateFrom: '2026-08-01', dateTo: '2026-08-05' });
    await createBlock(ctx.prisma, room, { dateFrom: '2026-08-10', dateTo: '2026-08-12' });
    await createBlock(ctx.prisma, room, { dateFrom: '2026-09-01', dateTo: '2026-09-02' });

    const res = await http()
      .get(`/api/v1/rooms/${room.id}/blocks?from=2026-08-05&to=2026-08-31`)
      .set(bearer(token))
      .expect(200);

    expect((res.body as AvailabilityBlockListDto).data.map((b) => b.dateFrom)).toEqual([
      '2026-08-01',
      '2026-08-10',
    ]);
  });

  it.each([
    ['dateTo before dateFrom', { dateFrom: '2026-08-22', dateTo: '2026-08-20' }],
    ['more than 366 nights', { dateFrom: '2026-08-01', dateTo: '2027-08-02' }],
    [
      'reason longer than 200',
      { dateFrom: '2026-08-20', dateTo: '2026-08-22', reason: 'x'.repeat(201) },
    ],
    ['missing dates', {}],
  ])('rejects %s (400)', async (_, body) => {
    await http().post(`/api/v1/rooms/${room.id}/blocks`).set(bearer(token)).send(body).expect(400);
  });

  describe('BR-01 (Q-15)', () => {
    it.each(['CONFIRMED', 'PENDING'] as const)(
      'BR-01: a block over a %s reservation → 409 BLOCK_OVERLAPS_RESERVATION with its number',
      async (status) => {
        const reservation = await createReservation(ctx.prisma, {
          room,
          guest,
          checkIn: '2026-08-14',
          checkOut: '2026-08-18',
          status,
        });

        const res = await block('2026-08-17', '2026-08-20').expect(409);

        expect(res.body).toMatchObject({
          code: 'BLOCK_OVERLAPS_RESERVATION',
          details: {
            conflictingReservationId: reservation.id,
            conflictingReservationNumber: reservation.number,
          },
        });
      },
    );

    it('BR-01: the check-out day of a stay can be blocked; the night before cannot', async () => {
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-13',
      });

      await block('2026-08-12', '2026-08-12').expect(409);
      await block('2026-08-13', '2026-08-14').expect(201);
      await block('2026-08-08', '2026-08-09').expect(201);
    });

    it("BR-01: cancelled, expired and other rooms' reservations do not block", async () => {
      const otherRoom = await createRoom(ctx.prisma, { id: room.propertyId });
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        status: 'CANCELLED',
      });
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        status: 'EXPIRED',
      });
      await createReservation(ctx.prisma, {
        room: otherRoom,
        guest,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
      });

      await block('2026-08-14', '2026-08-17').expect(201);
    });

    it('Q-15: blocks may overlap each other', async () => {
      await block('2026-08-14', '2026-08-20', 'Remont').expect(201);

      await block('2026-08-16', '2026-08-18', 'Użytek własny').expect(201);
    });
  });

  it('reason may be null', async () => {
    const res = await block('2026-08-20', '2026-08-20', null).expect(201);

    expect((res.body as AvailabilityBlockDto).reason).toBeNull();
  });
});
