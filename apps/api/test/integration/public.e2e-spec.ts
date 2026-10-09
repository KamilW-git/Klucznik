import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { Guest, Property, Room, User } from '../../src/infrastructure/prisma/generated/client';
import type {
  AvailabilityResultDto,
  PublicOccupancyDto,
  PublicPropertyDto,
  PublicReservationCreatedDto,
  PublicReservationDto,
} from '../../src/modules/public/http/public.dto';
import { hashGuestToken } from '../../src/modules/reservations/application/guest-token';
import type { ReservationPageDto } from '../../src/modules/reservations/http/reservation.dto';
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

const codeOf = (res: request.Response): string => (res.body as ErrorResponseDto).code;

// Limity /public/** liczone per IP: każdy test używa własnego adresu (za proxy: X-Forwarded-For).
let lastIp = 0;
const nextIp = (): string => `10.8.${Math.floor(++lastIp / 250)}.${(lastIp % 250) + 1}`;
let tokenSequence = 0;

// „Dziś” = 2026-08-01 (10:00 w Warszawie).
describe('Public guest booking (/api/v1/public)', () => {
  let ctx: TestApp;
  let owner: User;
  let property: Property;
  let room: Room;
  let guest: Guest;
  let ip: string;
  const http = () => request(ctx.app.getHttpServer());
  const get = (path: string) => http().get(`/api/v1/public${path}`).set('X-Forwarded-For', ip);
  const post = (path: string, body: object) =>
    http().post(`/api/v1/public${path}`).set('X-Forwarded-For', ip).send(body);
  const book = (body: object = {}) =>
    post(`/properties/${property.slug}/reservations`, {
      roomId: room.id,
      checkIn: '2026-08-14',
      checkOut: '2026-08-18',
      guestsCount: 2,
      guest: {
        firstName: 'Anna',
        lastName: 'Kowalska',
        email: 'Anna@Example.com',
        phone: '+48 600 100 200',
      },
      guestNotes: 'Przyjedziemy wieczorem',
      ...body,
    });

  /** Rezerwacja ze znanym tokenem: surowy token w testach zastępuje link z e-maila (M9). */
  async function reservationWithToken(
    input: { checkIn: string; checkOut: string; status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' },
    token = `test-token-${++tokenSequence}-${'x'.repeat(30)}`,
  ): Promise<string> {
    const reservation = await createReservation(ctx.prisma, {
      room,
      guest,
      source: 'ONLINE',
      ...input,
    });
    await ctx.prisma.reservation.update({
      where: { id: reservation.id },
      data: { guestAccessTokenHash: hashGuestToken(token), internalNotes: 'Tylko dla gospodarza' },
    });
    return token;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    owner = await createOwner(ctx.prisma);
    property = await createProperty(ctx.prisma, owner, {
      slug: 'zielona-zagroda',
      name: 'Zielona Zagroda',
    });
    room = await createRoom(ctx.prisma, property, {
      name: 'Domek Sosna',
      capacity: 4,
      basePricePerNight: 37_000,
    });
    guest = await createGuest(ctx.prisma, property);
    ip = nextIp();
  });

  describe('GET /public/properties/:slug', () => {
    it('returns the property with active rooms and priceFrom, without internal data', async () => {
      await createRoom(ctx.prisma, property, { name: 'Ukryty', isActive: false });
      const removed = await createRoom(ctx.prisma, property, { name: 'Usunięty' });
      await ctx.prisma.room.update({ where: { id: removed.id }, data: { deletedAt: new Date() } });
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
        pricePerNight: 30_000,
      });
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        pricePerNight: 10_000,
      }); // już minęła

      const res = await get('/properties/zielona-zagroda').expect(200);
      const dto = res.body as PublicPropertyDto;

      expect(dto).toMatchObject({
        name: 'Zielona Zagroda',
        slug: 'zielona-zagroda',
        pendingExpiryHours: 48,
      });
      expect(dto).not.toHaveProperty('ownerId');
      expect(dto).not.toHaveProperty('id');
      expect(dto.rooms).toEqual([
        expect.objectContaining({
          id: room.id,
          name: 'Domek Sosna',
          capacity: 4,
          priceFrom: 30_000,
          photos: [],
        }),
      ]);
    });

    it.each([
      ['inactive', { isActive: false }],
      ['deleted', { deletedAt: new Date('2026-07-01T00:00:00Z') }],
    ])('BR-13: %s property → 404', async (_, data) => {
      await ctx.prisma.property.update({ where: { id: property.id }, data });

      await get('/properties/zielona-zagroda').expect(404);
      await get(
        '/properties/zielona-zagroda/availability?checkIn=2026-08-14&checkOut=2026-08-16&guests=2',
      ).expect(404);
    });

    it('unknown slug → 404', async () => {
      expect(codeOf(await get('/properties/nie-ma').expect(404))).toBe('NOT_FOUND');
    });
  });

  describe('GET /public/properties/:slug/availability', () => {
    const availability = async (query: string): Promise<AvailabilityResultDto> =>
      (await get(`/properties/zielona-zagroda/availability?${query}`).expect(200))
        .body as AvailabilityResultDto;

    it('BR-01, BR-02, BR-03: lists all active rooms with the reason; price only for available ones', async () => {
      const busy = await createRoom(ctx.prisma, property, { name: 'Domek Zajęty' });
      const blocked = await createRoom(ctx.prisma, property, { name: 'Domek Remont' });
      await createRoom(ctx.prisma, property, { name: 'Domek Mały', capacity: 2 });
      const seasonal = await createRoom(ctx.prisma, property, { name: 'Domek Sezon' });
      await createRoom(ctx.prisma, property, { name: 'Domek Ukryty', isActive: false });
      await createReservation(ctx.prisma, {
        room: busy,
        guest,
        checkIn: '2026-08-15',
        checkOut: '2026-08-16',
        number: 'KL-2026-000777',
      });
      await createBlock(ctx.prisma, blocked, { dateFrom: '2026-08-17', dateTo: '2026-08-17' });
      await createSeasonalRate(ctx.prisma, seasonal, {
        dateFrom: '2026-07-01',
        dateTo: '2026-08-31',
        minNights: 7,
      });
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-08-16',
        dateTo: '2026-08-31',
        pricePerNight: 45_000,
      });

      const res = await get(
        '/properties/zielona-zagroda/availability?checkIn=2026-08-14&checkOut=2026-08-18&guests=3',
      ).expect(200);
      const dto = res.body as AvailabilityResultDto;
      const byName = Object.fromEntries(dto.rooms.map((r) => [r.room.name, r]));

      expect(dto).toMatchObject({
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        nights: 4,
        guests: 3,
        currency: 'PLN',
      });
      expect(Object.keys(byName).sort()).toEqual([
        'Domek Mały',
        'Domek Remont',
        'Domek Sezon',
        'Domek Sosna',
        'Domek Zajęty',
      ]);
      expect(byName['Domek Sosna']).toMatchObject({
        available: true,
        unavailableReason: null,
        totalPrice: 164_000,
        averagePricePerNight: 41_000,
        breakdown: [
          { date: '2026-08-14', price: 37_000 },
          { date: '2026-08-15', price: 37_000 },
          { date: '2026-08-16', price: 45_000 },
          { date: '2026-08-17', price: 45_000 },
        ],
      });
      expect(byName['Domek Zajęty']).toMatchObject({
        available: false,
        unavailableReason: 'OCCUPIED',
        totalPrice: null,
        breakdown: null,
      });
      expect(byName['Domek Remont']).toMatchObject({
        available: false,
        unavailableReason: 'OCCUPIED',
      });
      expect(byName['Domek Mały']).toMatchObject({
        available: false,
        unavailableReason: 'CAPACITY_EXCEEDED',
      });
      expect(byName['Domek Sezon']).toMatchObject({
        available: false,
        unavailableReason: 'MIN_NIGHTS_NOT_MET',
        minNights: 7,
      });
      // Dane innych rezerwacji nie wyciekają.
      expect(JSON.stringify(dto)).not.toContain('KL-2026-000777');
    });

    it('a property without active rooms → empty list', async () => {
      await ctx.prisma.room.update({ where: { id: room.id }, data: { isActive: false } });

      expect((await availability('checkIn=2026-08-14&checkOut=2026-08-16&guests=2')).rooms).toEqual(
        [],
      );
    });

    it.each([
      [
        'check-in in the past (no manual exception for guests)',
        'checkIn=2026-07-31&checkOut=2026-08-02',
        'CHECK_IN_IN_PAST',
      ],
      [
        'check-out not after check-in',
        'checkIn=2026-08-14&checkOut=2026-08-14',
        'CHECK_OUT_NOT_AFTER_CHECK_IN',
      ],
    ])('BR-04: %s → 422', async (_, dates, reason) => {
      const res = await get(`/properties/zielona-zagroda/availability?${dates}&guests=2`).expect(
        422,
      );

      expect(res.body).toMatchObject({ code: 'INVALID_STAY_DATES', details: { reason } });
    });

    it('missing guests → 400', async () => {
      await get(
        '/properties/zielona-zagroda/availability?checkIn=2026-08-14&checkOut=2026-08-16',
      ).expect(400);
    });
  });

  describe('GET /public/properties/:slug/occupancy', () => {
    it('Q-17: returns occupied nights (reservations and blocks) clipped to the range', async () => {
      const other = await createRoom(ctx.prisma, property, { name: 'Domek Brzoza' });
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-07-30',
        checkOut: '2026-08-02',
        status: 'PENDING',
      });
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-05',
        checkOut: '2026-08-06',
        status: 'CANCELLED',
      });
      await createBlock(ctx.prisma, other, { dateFrom: '2026-08-09', dateTo: '2026-08-12' });

      const res = await get(
        '/properties/zielona-zagroda/occupancy?from=2026-08-01&to=2026-08-10',
      ).expect(200);

      expect(res.body as PublicOccupancyDto).toEqual({
        from: '2026-08-01',
        to: '2026-08-10',
        rooms: [
          { roomId: other.id, occupiedNights: ['2026-08-09', '2026-08-10'] },
          { roomId: room.id, occupiedNights: ['2026-08-01'] },
        ],
      });
    });

    it('accepts at most 93 days', async () => {
      await get('/properties/zielona-zagroda/occupancy?from=2026-08-01&to=2026-11-01').expect(200);
      await get('/properties/zielona-zagroda/occupancy?from=2026-08-01&to=2026-11-02').expect(400);
    });
  });

  describe('POST /public/properties/:slug/reservations', () => {
    it('BR-07: creates a PENDING ONLINE reservation with expiresAt, without a token or Location', async () => {
      const res = await book().expect(201);
      const created = res.body as PublicReservationCreatedDto;

      expect(res.headers.location).toBeUndefined();
      expect(created).toEqual({
        number: 'KL-2026-000001',
        status: 'PENDING',
        room: { name: 'Domek Sosna' },
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        nights: 4,
        guestsCount: 2,
        totalPrice: 148_000,
        currency: 'PLN',
        expiresAt: '2026-08-03T08:00:00.000Z', // teraz + 48 h
        guestEmail: 'anna@example.com',
      });
      expect(JSON.stringify(res.body).toLowerCase()).not.toContain('token');

      const saved = await ctx.prisma.reservation.findUniqueOrThrow({
        where: { number: created.number },
        include: { events: true, guest: true },
      });
      expect(saved).toMatchObject({
        source: 'ONLINE',
        status: 'PENDING',
        confirmedAt: null,
        guestNotes: 'Przyjedziemy wieczorem',
      });
      expect(saved.guestAccessTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.events).toMatchObject([
        { type: 'CREATED', actorType: 'GUEST', actorUserId: null },
      ]);
      expect(saved.guest).toMatchObject({ email: 'anna@example.com', phone: '+48 600 100 200' });

      // Właściciel widzi prośbę w panelu.
      const panel = await http()
        .get('/api/v1/reservations?status=PENDING')
        .set(bearer(accessTokenFor(ctx.app, owner)))
        .expect(200);
      expect((panel.body as ReservationPageDto).data.map((r) => r.number)).toEqual([
        created.number,
      ]);
    });

    it('BR-05: a client-side price → 400', async () => {
      expect(codeOf(await book({ totalPrice: 1 }).expect(400))).toBe('VALIDATION_ERROR');
    });

    it('Q-03: e-mail and phone are required online', async () => {
      await book({ guest: { firstName: 'Anna', lastName: 'Kowalska', phone: '600100200' } }).expect(
        400,
      );
      await book({
        guest: { firstName: 'Anna', lastName: 'Kowalska', email: 'a@example.com' },
      }).expect(400);
    });

    it('BR-01: an occupied term → 409 RESERVATION_OVERLAP', async () => {
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-17',
        checkOut: '2026-08-20',
        status: 'PENDING',
      });

      expect(codeOf(await book().expect(409))).toBe('RESERVATION_OVERLAP');
    });

    it('BR-03, BR-04: guests get no exceptions (minNights, past check-in) → 422', async () => {
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-07-01',
        dateTo: '2026-08-31',
        minNights: 5,
      });

      expect(codeOf(await book().expect(422))).toBe('MIN_NIGHTS_NOT_MET');
      expect(
        codeOf(await book({ checkIn: '2026-07-31', checkOut: '2026-08-02' }).expect(422)),
      ).toBe('INVALID_STAY_DATES');
    });

    it('BR-13, BR-12: inactive room → 422; a room of another property → 404', async () => {
      const inactive = await createRoom(ctx.prisma, property, { isActive: false });
      const foreign = await createRoom(ctx.prisma, await createProperty(ctx.prisma, owner));

      expect(codeOf(await book({ roomId: inactive.id }).expect(422))).toBe('ROOM_NOT_BOOKABLE');
      await book({ roomId: foreign.id }).expect(404);
    });

    it('rate limit: the 6th POST from one IP within a minute → 429 RATE_LIMITED', async () => {
      for (let i = 0; i < 5; i++) {
        await post('/reservations/nieznany-token/cancel', {}).expect(404);
      }

      expect(codeOf(await post('/reservations/nieznany-token/cancel', {}).expect(429))).toBe(
        'RATE_LIMITED',
      );
      ip = nextIp();
      await post('/reservations/nieznany-token/cancel', {}).expect(404);
    });
  });

  describe('/public/reservations/:token', () => {
    it('shows the reservation for the guest without internal notes', async () => {
      const token = await reservationWithToken({ checkIn: '2026-08-14', checkOut: '2026-08-18' });

      const res = await get(`/reservations/${token}`).expect(200);
      const dto = res.body as PublicReservationDto;

      expect(dto).toMatchObject({
        status: 'CONFIRMED',
        property: { name: 'Zielona Zagroda', slug: 'zielona-zagroda', checkInTime: '15:00' },
        room: { name: 'Domek Sosna', coverPhoto: null },
        checkIn: '2026-08-14',
        nights: 4,
        canCancel: true,
        cancellableUntil: '2026-08-07',
        cancelledAt: null,
      });
      expect(JSON.stringify(dto)).not.toContain('Tylko dla gospodarza');
    });

    it('Q-11: unknown token and a link after checkOut + 30 days → 404', async () => {
      const expired = await reservationWithToken({ checkIn: '2026-06-28', checkOut: '2026-06-30' });
      const lastDay = await reservationWithToken({ checkIn: '2026-06-30', checkOut: '2026-07-02' });

      await get('/reservations/nieznany-token').expect(404);
      await get(`/reservations/${expired}`).expect(404);
      await get(`/reservations/${lastDay}`).expect(200); // 02.07 + 30 dni = 01.08 (dziś)
    });

    it('BR-08: guest cancels CONFIRMED before the deadline → 200; again → 409', async () => {
      const token = await reservationWithToken({ checkIn: '2026-08-14', checkOut: '2026-08-18' });

      const res = await post(`/reservations/${token}/cancel`, { reason: 'Zmiana planów' }).expect(
        200,
      );
      const again = await post(`/reservations/${token}/cancel`, {}).expect(409);

      expect(res.body).toMatchObject({
        status: 'CANCELLED',
        canCancel: false,
        cancellableUntil: null,
      });
      expect(codeOf(again)).toBe('INVALID_STATUS_TRANSITION');
      const saved = await ctx.prisma.reservation.findFirstOrThrow({
        where: { guestAccessTokenHash: hashGuestToken(token) },
        include: { events: true },
      });
      expect(saved).toMatchObject({ cancelledBy: 'GUEST', cancellationReason: 'Zmiana planów' });
      expect(saved.events).toMatchObject([
        { type: 'CANCELLED', actorType: 'GUEST', payload: { reason: 'Zmiana planów' } },
      ]);
    });

    it('BR-08: CONFIRMED after the deadline → 422 CANCELLATION_DEADLINE_PASSED', async () => {
      const token = await reservationWithToken({ checkIn: '2026-08-05', checkOut: '2026-08-07' });

      const view = await get(`/reservations/${token}`).expect(200);
      const res = await post(`/reservations/${token}/cancel`, {}).expect(422);

      expect(view.body).toMatchObject({ canCancel: false, cancellableUntil: '2026-07-29' });
      expect(res.body).toMatchObject({
        code: 'CANCELLATION_DEADLINE_PASSED',
        details: { cancellableUntil: '2026-07-29' },
      });
    });

    it('BR-08: PENDING can be cancelled even the day before arrival', async () => {
      const token = await reservationWithToken({
        checkIn: '2026-08-02',
        checkOut: '2026-08-04',
        status: 'PENDING',
      });

      await post(`/reservations/${token}/cancel`, {}).expect(200);
    });
  });
});
