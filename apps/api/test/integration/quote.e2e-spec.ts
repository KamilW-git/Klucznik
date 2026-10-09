import request from 'supertest';

import type { Guest, Property, Room } from '../../src/infrastructure/prisma/generated/client';
import type { RoomQuoteDto } from '../../src/modules/availability/http/quote.dto';
import {
  createBlock,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
  createSeasonalRate,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

// „Dziś” = 2026-08-01.
describe('GET /rooms/:id/quote', () => {
  let ctx: TestApp;
  let property: Property;
  let room: Room;
  let guest: Guest;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const quote = (query: string, roomId = room.id) =>
    http().get(`/api/v1/rooms/${roomId}/quote?${query}`).set(bearer(token));
  const body = (res: request.Response): RoomQuoteDto => res.body as RoomQuoteDto;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    const owner = await createOwner(ctx.prisma);
    property = await createProperty(ctx.prisma, owner);
    room = await createRoom(ctx.prisma, property, { capacity: 4, basePricePerNight: 37_000 });
    guest = await createGuest(ctx.prisma, property);
    token = accessTokenFor(ctx.app, owner);
  });

  it('BR-05: available stay across the season start: 370 + 370 + 450 + 450 zł = 164 000 gr', async () => {
    const season = await createSeasonalRate(ctx.prisma, room, {
      dateFrom: '2026-08-16',
      dateTo: '2026-08-31',
      pricePerNight: 45_000,
    });

    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-18&guests=3').expect(200);

    expect(body(res)).toEqual({
      roomId: room.id,
      checkIn: '2026-08-14',
      checkOut: '2026-08-18',
      nights: 4,
      available: true,
      unavailableReason: null,
      conflicts: [],
      minNights: 1,
      totalPrice: 164_000,
      currency: 'PLN',
      breakdown: [
        { date: '2026-08-14', price: 37_000, rateId: null },
        { date: '2026-08-15', price: 37_000, rateId: null },
        { date: '2026-08-16', price: 45_000, rateId: season.id },
        { date: '2026-08-17', price: 45_000, rateId: season.id },
      ],
    });
  });

  it('BR-13: inactive room → ROOM_NOT_BOOKABLE (price still reported)', async () => {
    await ctx.prisma.room.update({ where: { id: room.id }, data: { isActive: false } });

    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-16&guests=2').expect(200);

    expect(body(res)).toMatchObject({
      available: false,
      unavailableReason: 'ROOM_NOT_BOOKABLE',
      totalPrice: 74_000,
    });
  });

  it('BR-13: inactive property → ROOM_NOT_BOOKABLE', async () => {
    await ctx.prisma.property.update({ where: { id: property.id }, data: { isActive: false } });

    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-16&guests=2').expect(200);

    expect(body(res).unavailableReason).toBe('ROOM_NOT_BOOKABLE');
  });

  it('BR-02: more guests than capacity → CAPACITY_EXCEEDED', async () => {
    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-16&guests=5').expect(200);

    expect(body(res)).toMatchObject({ available: false, unavailableReason: 'CAPACITY_EXCEEDED' });
  });

  it('BR-03: 2 nights in a 3-night season → MIN_NIGHTS_NOT_MET with minNights', async () => {
    await createSeasonalRate(ctx.prisma, room, {
      dateFrom: '2026-07-01',
      dateTo: '2026-08-31',
      minNights: 3,
    });

    const short = await quote('checkIn=2026-08-14&checkOut=2026-08-16&guests=2').expect(200);
    const arrivalBefore = await quote('checkIn=2026-09-01&checkOut=2026-09-02&guests=2').expect(
      200,
    );

    expect(body(short)).toMatchObject({
      available: false,
      unavailableReason: 'MIN_NIGHTS_NOT_MET',
      minNights: 3,
    });
    expect(body(arrivalBefore)).toMatchObject({ available: true, minNights: 1 });
  });

  it('BR-01: a reservation or a block on a night → OCCUPIED with conflicts', async () => {
    const reservation = await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-10',
      checkOut: '2026-08-15',
      status: 'PENDING',
    });
    const blocked = await createBlock(ctx.prisma, room, {
      dateFrom: '2026-08-17',
      dateTo: '2026-08-17',
    });

    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-18&guests=2').expect(200);

    expect(body(res)).toMatchObject({
      available: false,
      unavailableReason: 'OCCUPIED',
      conflicts: [
        {
          type: 'RESERVATION',
          id: reservation.id,
          number: reservation.number,
          dateFrom: '2026-08-10',
          dateTo: '2026-08-15',
        },
        {
          type: 'BLOCK',
          id: blocked.id,
          number: null,
          dateFrom: '2026-08-17',
          dateTo: '2026-08-17',
        },
      ],
    });
  });

  it('BR-01: back-to-back stays and cancelled reservations do not collide', async () => {
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-10',
      checkOut: '2026-08-14',
    });
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-18',
      checkOut: '2026-08-20',
    });
    await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-14',
      checkOut: '2026-08-18',
      status: 'CANCELLED',
    });
    await createBlock(ctx.prisma, room, { dateFrom: '2026-08-18', dateTo: '2026-08-19' });

    const res = await quote('checkIn=2026-08-14&checkOut=2026-08-18&guests=2').expect(200);

    expect(body(res)).toMatchObject({ available: true, conflicts: [] });
  });

  it('BR-01: excludeReservationId ignores the edited reservation itself', async () => {
    const own = await createReservation(ctx.prisma, {
      room,
      guest,
      checkIn: '2026-08-14',
      checkOut: '2026-08-16',
    });

    const res = await quote(
      `checkIn=2026-08-14&checkOut=2026-08-17&guests=2&excludeReservationId=${own.id}`,
    ).expect(200);

    expect(body(res).available).toBe(true);
  });

  it.each([
    [
      'check-out not after check-in',
      'checkIn=2026-08-14&checkOut=2026-08-14',
      'CHECK_OUT_NOT_AFTER_CHECK_IN',
    ],
    ['check-in 31 days in the past', 'checkIn=2026-07-01&checkOut=2026-07-03', 'CHECK_IN_IN_PAST'],
    ['stay of 31 nights', 'checkIn=2026-08-10&checkOut=2026-09-10', 'STAY_TOO_LONG'],
  ])('BR-04: %s → 422 INVALID_STAY_DATES', async (_, dates, reason) => {
    const res = await quote(`${dates}&guests=2`).expect(422);

    expect(res.body).toMatchObject({ code: 'INVALID_STAY_DATES', details: { reason } });
  });

  it('BR-04: manual quote accepts check-in up to 30 days back (Q-01)', async () => {
    await quote('checkIn=2026-07-02&checkOut=2026-07-04&guests=2').expect(200);
  });

  it.each([
    ['missing guests', 'checkIn=2026-08-14&checkOut=2026-08-16'],
    ['guests not an integer', 'checkIn=2026-08-14&checkOut=2026-08-16&guests=dwa'],
    ['invalid date', 'checkIn=2026-02-30&checkOut=2026-03-02&guests=2'],
    [
      'invalid excludeReservationId',
      'checkIn=2026-08-14&checkOut=2026-08-16&guests=2&excludeReservationId=x',
    ],
  ])('rejects %s (400)', async (_, query) => {
    await quote(query).expect(400);
  });
});
