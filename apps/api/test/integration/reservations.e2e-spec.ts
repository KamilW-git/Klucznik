import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { Guest, Property, Room, User } from '../../src/infrastructure/prisma/generated/client';
import type {
  ReservationDto,
  ReservationPageDto,
} from '../../src/modules/reservations/http/reservation.dto';
import {
  createAdmin,
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
const dto = (res: request.Response): ReservationDto => res.body as ReservationDto;

// „Dziś” = 2026-08-01 (10:00 w Warszawie).
describe('Reservations (panel)', () => {
  let ctx: TestApp;
  let owner: User;
  let property: Property;
  let room: Room;
  let guest: Guest;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const manual = (body: object) =>
    http()
      .post(`/api/v1/properties/${property.id}/reservations`)
      .set(bearer(token))
      .send({
        roomId: room.id,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        guestsCount: 2,
        guest: { firstName: 'Anna', lastName: 'Kowalska', email: 'Anna.Kowalska@Example.com' },
        ...body,
      });
  const patch = (id: string, body: object) =>
    http().patch(`/api/v1/reservations/${id}`).set(bearer(token)).send(body);

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    owner = await createOwner(ctx.prisma, { firstName: 'Jan', lastName: 'Gospodarz' });
    property = await createProperty(ctx.prisma, owner);
    room = await createRoom(ctx.prisma, property, { capacity: 4, basePricePerNight: 37_000 });
    guest = await createGuest(ctx.prisma, property);
    token = accessTokenFor(ctx.app, owner);
  });

  describe('POST /properties/:id/reservations (manual)', () => {
    it('BR-05: creates a CONFIRMED MANUAL reservation with the server price, number and history', async () => {
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-08-16',
        dateTo: '2026-08-31',
        pricePerNight: 45_000,
      });

      const res = await manual({ internalNotes: 'Telefon', totalPrice: 1 }).expect(400);
      expect(codeOf(res)).toBe('VALIDATION_ERROR'); // klient nie podaje ceny (BR-05)

      const created = await manual({ internalNotes: 'Telefon' }).expect(201);
      const reservation = dto(created);

      expect(created.headers.location).toBe(`/api/v1/reservations/${reservation.id}`);
      expect(reservation).toMatchObject({
        number: 'KL-2026-000001',
        status: 'CONFIRMED',
        source: 'MANUAL',
        nights: 4,
        totalPrice: 164_000,
        currency: 'PLN',
        priceBreakdown: [
          { date: '2026-08-14', price: 37_000 },
          { date: '2026-08-15', price: 37_000 },
          { date: '2026-08-16', price: 45_000 },
          { date: '2026-08-17', price: 45_000 },
        ],
        internalNotes: 'Telefon',
        version: 1,
        expiresAt: null,
        guest: { firstName: 'Anna', lastName: 'Kowalska', email: 'anna.kowalska@example.com' },
        events: [{ type: 'CREATED', actorType: 'OWNER', actorName: 'Jan Gospodarz' }],
      });
      expect(reservation.confirmedAt).not.toBeNull();
    });

    it('Q-12: numbers grow per year and continue from the counter', async () => {
      await ctx.prisma.reservationCounter.create({ data: { year: 2026, lastValue: 122 } });

      const first = await manual({}).expect(201);
      const second = await manual({ checkIn: '2026-08-20', checkOut: '2026-08-22' }).expect(201);

      expect([dto(first).number, dto(second).number]).toEqual(['KL-2026-000123', 'KL-2026-000124']);
    });

    it('Q-04: an existing guest e-mail updates the guest instead of creating a duplicate', async () => {
      const first = await manual({
        guest: {
          firstName: 'Ania',
          lastName: 'Nowak',
          email: 'ania@example.com',
          phone: '600100200',
        },
      }).expect(201);
      const second = await manual({
        checkIn: '2026-08-20',
        checkOut: '2026-08-22',
        guest: { firstName: 'Anna', lastName: 'Nowak-Kowalska', email: 'ANIA@example.com' },
      }).expect(201);

      expect(dto(second).guest.id).toBe(dto(first).guest.id);
      expect(dto(second).guest).toMatchObject({
        firstName: 'Anna',
        lastName: 'Nowak-Kowalska',
        phone: '600100200', // brak telefonu w nowych danych nie kasuje znanego
      });
      await expect(ctx.prisma.guest.count({ where: { email: 'ania@example.com' } })).resolves.toBe(
        1,
      );
    });

    it('Q-03: a guest without e-mail is always a new record; an existing guest can be chosen by id', async () => {
      const a = await manual({ guest: { firstName: 'Jan', lastName: 'Bez Maila' } }).expect(201);
      const b = await manual({
        checkIn: '2026-08-20',
        checkOut: '2026-08-22',
        guest: { firstName: 'Jan', lastName: 'Bez Maila' },
      }).expect(201);
      const byId = await manual({
        checkIn: '2026-08-24',
        checkOut: '2026-08-26',
        guest: { id: guest.id },
      }).expect(201);

      expect(dto(a).guest.id).not.toBe(dto(b).guest.id);
      expect(dto(a).guest.email).toBeNull();
      expect(dto(byId).guest.id).toBe(guest.id);
    });

    it('BR-12: a guest of another property → 404; id combined with guest data → 400', async () => {
      const otherProperty = await createProperty(ctx.prisma, owner);
      const foreignGuest = await createGuest(ctx.prisma, otherProperty);

      await manual({ guest: { id: foreignGuest.id } }).expect(404);
      await manual({ guest: { id: guest.id, firstName: 'X' } }).expect(400);
      await manual({ guest: { email: 'bez-imienia@example.com' } }).expect(400);
    });

    it('a room of another property or a deleted room → 404', async () => {
      const otherProperty = await createProperty(ctx.prisma, owner);
      const otherRoom = await createRoom(ctx.prisma, otherProperty);
      const deleted = await createRoom(ctx.prisma, property);
      await ctx.prisma.room.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });

      await manual({ roomId: otherRoom.id }).expect(404);
      await manual({ roomId: deleted.id }).expect(404);
    });

    it('BR-01: an occupied term → 409 RESERVATION_OVERLAP (reservation or block); back-to-back is fine', async () => {
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-15',
      });
      await createBlock(ctx.prisma, room, { dateFrom: '2026-08-25', dateTo: '2026-08-26' });

      const overlap = await manual({}).expect(409);
      const blocked = await manual({ checkIn: '2026-08-24', checkOut: '2026-08-26' }).expect(409);
      await manual({ checkIn: '2026-08-15', checkOut: '2026-08-18' }).expect(201);

      expect(codeOf(overlap)).toBe('RESERVATION_OVERLAP');
      expect(codeOf(blocked)).toBe('RESERVATION_OVERLAP');
    });

    it('BR-01: two concurrent requests for the same term → exactly one 201', async () => {
      const results = await Promise.all([
        manual({ guest: { firstName: 'A', lastName: 'Pierwsza' } }),
        manual({ guest: { firstName: 'B', lastName: 'Druga' }, checkIn: '2026-08-15' }),
        manual({ guest: { firstName: 'C', lastName: 'Trzecia' }, checkOut: '2026-08-16' }),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
      await expect(ctx.prisma.reservation.count({ where: { roomId: room.id } })).resolves.toBe(1);
      // Odrzucone żądania nie zużyły numerów ani nie utworzyły gości (rollback transakcji).
      await expect(
        ctx.prisma.reservationCounter.findUnique({ where: { year: 2026 } }),
      ).resolves.toMatchObject({
        lastValue: 1,
      });
      await expect(ctx.prisma.guest.count({ where: { propertyId: property.id } })).resolves.toBe(2);
    });

    it.each([
      ['BR-02: more guests than capacity', { guestsCount: 5 }, 'CAPACITY_EXCEEDED'],
      [
        'BR-04: check-in 31 days back',
        { checkIn: '2026-07-01', checkOut: '2026-07-03' },
        'INVALID_STAY_DATES',
      ],
      [
        'BR-04: check-out before check-in',
        { checkIn: '2026-08-18', checkOut: '2026-08-14' },
        'INVALID_STAY_DATES',
      ],
    ])('%s → 422 %s', async (_, body, code) => {
      const res = await manual(body).expect(422);

      expect(codeOf(res)).toBe(code);
    });

    it('BR-13: inactive room → 422 ROOM_NOT_BOOKABLE', async () => {
      await ctx.prisma.room.update({ where: { id: room.id }, data: { isActive: false } });

      expect(codeOf(await manual({}).expect(422))).toBe('ROOM_NOT_BOOKABLE');
    });

    it('BR-03: minNights of the season applies unless ignoreMinNights (Q-01)', async () => {
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-07-01',
        dateTo: '2026-08-31',
        minNights: 5,
      });

      const res = await manual({}).expect(422);
      await manual({ ignoreMinNights: true }).expect(201);

      expect(res.body).toMatchObject({ code: 'MIN_NIGHTS_NOT_MET', details: { minNights: 5 } });
    });

    it('Q-01: manual check-in up to 30 days back is allowed', async () => {
      await manual({ checkIn: '2026-07-02', checkOut: '2026-07-04' }).expect(201);
    });
  });

  describe('GET /reservations', () => {
    it('filters by status, room, dates, source and q; sorts and paginates', async () => {
      const other = await createRoom(ctx.prisma, property, { name: 'Inny' });
      const nowak = await createGuest(ctx.prisma, property, {
        lastName: 'Nowak',
        email: 'nowak@example.com',
      });
      const a = await createReservation(ctx.prisma, {
        room,
        guest: nowak,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        status: 'PENDING',
        number: 'KL-2026-000010',
      });
      const b = await createReservation(ctx.prisma, {
        room: other,
        guest,
        checkIn: '2026-08-05',
        checkOut: '2026-08-07',
        number: 'KL-2026-000011',
      });
      const c = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-09-01',
        checkOut: '2026-09-03',
        status: 'CANCELLED',
        source: 'ONLINE',
        number: 'KL-2026-000012',
      });
      const list = async (query: string) =>
        (await http().get(`/api/v1/reservations?${query}`).set(bearer(token)).expect(200))
          .body as ReservationPageDto;

      expect((await list('')).data.map((r) => r.id)).toEqual([b.id, a.id, c.id]);
      expect((await list('status=PENDING,CONFIRMED')).data.map((r) => r.id)).toEqual([b.id, a.id]);
      expect((await list(`roomId=${room.id}`)).data.map((r) => r.id)).toEqual([a.id, c.id]);
      expect((await list('from=2026-08-07&to=2026-08-10')).data.map((r) => r.id)).toEqual([a.id]);
      expect((await list('source=ONLINE')).data.map((r) => r.id)).toEqual([c.id]);
      expect((await list('q=nowak')).data.map((r) => r.id)).toEqual([a.id]);
      expect((await list('q=000012')).data.map((r) => r.id)).toEqual([c.id]);
      expect((await list('sort=number:desc')).data.map((r) => r.id)).toEqual([c.id, b.id, a.id]);

      const page = await list('pageSize=2&page=2');
      expect(page.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
      expect(page.data.map((r) => r.id)).toEqual([c.id]);
    });

    it.each(['status=UNKNOWN', 'sort=guest:asc', 'from=2026-08-10&to=2026-08-01', 'q=a'])(
      'rejects %s (400)',
      async (query) => {
        await http().get(`/api/v1/reservations?${query}`).set(bearer(token)).expect(400);
      },
    );

    it('BR-12: OWNER sees only own reservations (even with a foreign propertyId); ADMIN sees all', async () => {
      const otherOwner = await createOwner(ctx.prisma);
      const foreignProperty = await createProperty(ctx.prisma, otherOwner);
      const foreignRoom = await createRoom(ctx.prisma, foreignProperty);
      const own = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
      });
      await createReservation(ctx.prisma, {
        room: foreignRoom,
        guest: await createGuest(ctx.prisma, foreignProperty),
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
      });
      const adminToken = accessTokenFor(ctx.app, await createAdmin(ctx.prisma));

      const mine = await http().get('/api/v1/reservations').set(bearer(token)).expect(200);
      const foreign = await http()
        .get(`/api/v1/reservations?propertyId=${foreignProperty.id}`)
        .set(bearer(token))
        .expect(200);
      const all = await http().get('/api/v1/reservations').set(bearer(adminToken)).expect(200);

      expect((mine.body as ReservationPageDto).data.map((r) => r.id)).toEqual([own.id]);
      expect((foreign.body as ReservationPageDto).data).toEqual([]);
      expect((all.body as ReservationPageDto).meta.totalItems).toBe(2);
    });
  });

  describe('confirm and cancel', () => {
    it('BR-06: confirms a PENDING reservation and records who did it', async () => {
      const pending = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        status: 'PENDING',
      });
      await ctx.prisma.reservation.update({
        where: { id: pending.id },
        data: { expiresAt: new Date('2026-08-02T10:00:00+02:00') },
      });

      const res = await http()
        .post(`/api/v1/reservations/${pending.id}/confirm`)
        .set(bearer(token))
        .expect(200);

      expect(dto(res)).toMatchObject({ status: 'CONFIRMED', expiresAt: null, version: 2 });
      expect(dto(res).events).toMatchObject([
        { type: 'CONFIRMED', actorType: 'OWNER', actorName: 'Jan Gospodarz' },
      ]);
    });

    it('BR-06: confirming a cancelled reservation → 409 INVALID_STATUS_TRANSITION', async () => {
      const cancelled = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        status: 'CANCELLED',
      });

      const res = await http()
        .post(`/api/v1/reservations/${cancelled.id}/confirm`)
        .set(bearer(token))
        .expect(409);

      expect(res.body).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        details: { from: 'CANCELLED', to: 'CONFIRMED' },
      });
    });

    it('BR-07: confirming after expiresAt → 409 even before the expiry job runs', async () => {
      const pending = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        status: 'PENDING',
      });
      await ctx.prisma.reservation.update({
        where: { id: pending.id },
        data: { expiresAt: new Date('2026-08-01T10:00:00+02:00') },
      });

      const res = await http()
        .post(`/api/v1/reservations/${pending.id}/confirm`)
        .set(bearer(token))
        .expect(409);

      expect(res.body).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        details: { expired: true },
      });
    });

    it('BR-06: owner cancels a CONFIRMED reservation with a reason; the term becomes free', async () => {
      const confirmed = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
      });

      const res = await http()
        .post(`/api/v1/reservations/${confirmed.id}/cancel`)
        .set(bearer(token))
        .send({ reason: 'Prośba gościa' })
        .expect(200);
      await manual({}).expect(201);

      expect(dto(res)).toMatchObject({
        status: 'CANCELLED',
        cancelledBy: 'OWNER',
        cancellationReason: 'Prośba gościa',
        events: [{ type: 'CANCELLED', payload: { reason: 'Prośba gościa' } }],
      });
      await http()
        .post(`/api/v1/reservations/${confirmed.id}/cancel`)
        .set(bearer(token))
        .send({})
        .expect(409);
    });

    it('BR-06: ADMIN rejects a PENDING reservation (cancelledBy ADMIN)', async () => {
      const pending = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        status: 'PENDING',
      });
      const adminToken = accessTokenFor(ctx.app, await createAdmin(ctx.prisma));

      const res = await http()
        .post(`/api/v1/reservations/${pending.id}/cancel`)
        .set(bearer(adminToken))
        .send({})
        .expect(200);

      expect(dto(res)).toMatchObject({
        status: 'CANCELLED',
        cancelledBy: 'ADMIN',
        cancellationReason: null,
      });
    });
  });

  describe('PATCH /reservations/:id', () => {
    it('BR-11: two PATCHes with the same version → 200, then 409 VERSION_CONFLICT', async () => {
      const created = dto(await manual({}).expect(201));

      const first = await patch(created.id, { version: 1, internalNotes: 'Pierwsza karta' }).expect(
        200,
      );
      const second = await patch(created.id, { version: 1, internalNotes: 'Druga karta' }).expect(
        409,
      );

      expect(dto(first)).toMatchObject({ internalNotes: 'Pierwsza karta', version: 2 });
      expect(codeOf(second)).toBe('VERSION_CONFLICT');
      expect(dto(first).events.map((e) => [e.type, e.payload])).toEqual([
        ['CREATED', { source: 'MANUAL', status: 'CONFIRMED' }],
        ['UPDATED', { fields: ['internalNotes'] }],
      ]);
    });

    it('version is required (400)', async () => {
      const created = dto(await manual({}).expect(201));

      await patch(created.id, { internalNotes: 'Bez wersji' }).expect(400);
    });

    it('Q-02, BR-05: new dates are re-validated and repriced with the current price list', async () => {
      const created = dto(await manual({}).expect(201));
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-08-20',
        dateTo: '2026-08-31',
        pricePerNight: 50_000,
      });

      const res = await patch(created.id, {
        version: 1,
        checkIn: '2026-08-16',
        checkOut: '2026-08-21',
      }).expect(200);

      // 16–19: 4 × 370 zł, 20: 500 zł; własny poprzedni termin nie jest kolizją.
      expect(dto(res)).toMatchObject({
        checkIn: '2026-08-16',
        checkOut: '2026-08-21',
        totalPrice: 198_000,
        version: 2,
      });
      expect(dto(res).events.at(-1)?.payload).toEqual({ fields: ['checkIn', 'checkOut'] });
    });

    it('BR-01: moving to an occupied room → 409; to a free room of the property → 200', async () => {
      const created = dto(await manual({}).expect(201));
      const busy = await createRoom(ctx.prisma, property, { name: 'Zajęty' });
      const free = await createRoom(ctx.prisma, property, {
        name: 'Wolny',
        basePricePerNight: 20_000,
      });
      await createReservation(ctx.prisma, {
        room: busy,
        guest,
        checkIn: '2026-08-15',
        checkOut: '2026-08-16',
      });

      const conflict = await patch(created.id, { version: 1, roomId: busy.id }).expect(409);
      const moved = await patch(created.id, { version: 1, roomId: free.id }).expect(200);

      expect(codeOf(conflict)).toBe('RESERVATION_OVERLAP');
      expect(dto(moved)).toMatchObject({ room: { id: free.id }, totalPrice: 80_000 });
    });

    it('BR-02: guestsCount above the capacity → 422', async () => {
      const created = dto(await manual({}).expect(201));

      expect(codeOf(await patch(created.id, { version: 1, guestsCount: 5 }).expect(422))).toBe(
        'CAPACITY_EXCEEDED',
      );
      await patch(created.id, { version: 1, guestsCount: 4 }).expect(200);
    });

    it('Q-02: a past or cancelled reservation allows only internalNotes', async () => {
      const past = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-07-20',
        checkOut: '2026-07-22',
        status: 'COMPLETED',
      });

      const res = await patch(past.id, {
        version: 1,
        guestNotes: 'x',
        internalNotes: 'Notatka',
      }).expect(409);
      await patch(past.id, { version: 1, internalNotes: 'Notatka' }).expect(200);

      expect(res.body).toMatchObject({
        code: 'RESERVATION_NOT_EDITABLE',
        details: { fields: ['guestNotes'] },
      });
    });

    it('Q-01: ignoreMinNights applies to MANUAL reservations only', async () => {
      await createSeasonalRate(ctx.prisma, room, {
        dateFrom: '2026-07-01',
        dateTo: '2026-08-31',
        minNights: 5,
      });
      const created = dto(await manual({ ignoreMinNights: true }).expect(201));
      const online = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-20',
        checkOut: '2026-08-26',
        source: 'ONLINE',
      });

      await patch(created.id, { version: 1, checkOut: '2026-08-17' }).expect(422);
      await patch(created.id, { version: 1, checkOut: '2026-08-17', ignoreMinNights: true }).expect(
        200,
      );
      const res = await patch(online.id, {
        version: 1,
        checkOut: '2026-08-22',
        ignoreMinNights: true,
      }).expect(422);

      expect(codeOf(res)).toBe('MIN_NIGHTS_NOT_MET');
    });
  });
});
