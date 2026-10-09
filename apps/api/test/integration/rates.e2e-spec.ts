import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { Room } from '../../src/infrastructure/prisma/generated/client';
import type { SeasonalRateDto, SeasonalRateListDto } from '../../src/modules/pricing/http/rate.dto';
import {
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

const highSeason = {
  name: 'Wysoki sezon',
  dateFrom: '2026-07-01',
  dateTo: '2026-08-31',
  pricePerNight: 45000,
  minNights: 3,
};

const fieldsOf = (res: request.Response): string[] =>
  (res.body as ErrorResponseDto & { details: { fields: { field: string }[] } }).details.fields.map(
    (f) => f.field,
  );

describe('Seasonal rates', () => {
  let ctx: TestApp;
  let room: Room;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const post = (body: object) =>
    http().post(`/api/v1/rooms/${room.id}/rates`).set(bearer(token)).send(body);

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
    token = accessTokenFor(ctx.app, owner);
  });

  it('creates a rate (201 + Location)', async () => {
    const res = await post(highSeason).expect(201);
    const rate = res.body as SeasonalRateDto;

    expect(res.headers.location).toBe(`/api/v1/rates/${rate.id}`);
    expect(rate).toMatchObject({ ...highSeason, roomId: room.id, currency: 'PLN' });
  });

  it('minNights is optional (null = room minNights)', async () => {
    const res = await post({ ...highSeason, minNights: undefined }).expect(201);

    expect((res.body as SeasonalRateDto).minNights).toBeNull();
  });

  it.each([
    ['dateTo before dateFrom', { dateFrom: '2026-08-31', dateTo: '2026-07-01' }, 'dateTo'],
    ['range longer than 366 nights', { dateFrom: '2026-01-01', dateTo: '2027-01-02' }, 'dateTo'],
    ['non-existent date', { dateFrom: '2026-02-30' }, 'dateFrom'],
    ['negative price', { pricePerNight: -1 }, 'pricePerNight'],
    ['minNights above 30', { minNights: 31 }, 'minNights'],
    ['name longer than 80', { name: 'x'.repeat(81) }, 'name'],
    ['client-side price total', { totalPrice: 1 }, 'totalPrice'],
  ])('rejects %s (400)', async (_, change, field) => {
    const res = await post({ ...highSeason, ...change }).expect(400);

    expect(fieldsOf(res)).toContain(field);
  });

  it('accepts a 366-night range (leap year limit)', async () => {
    await post({ ...highSeason, dateFrom: '2027-01-01', dateTo: '2028-01-01' }).expect(201);
  });

  it('lists rates sorted by dateFrom, filtered by intersection with [from, to]', async () => {
    await createSeasonalRate(ctx.prisma, room, {
      name: 'Zima',
      dateFrom: '2026-12-20',
      dateTo: '2027-01-06',
    });
    await createSeasonalRate(ctx.prisma, room, {
      name: 'Lato',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-31',
    });
    await createSeasonalRate(ctx.prisma, room, {
      name: 'Majówka',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-03',
    });

    const all = await http().get(`/api/v1/rooms/${room.id}/rates`).set(bearer(token)).expect(200);
    const filtered = await http()
      .get(`/api/v1/rooms/${room.id}/rates?from=2026-08-31&to=2026-12-20`)
      .set(bearer(token))
      .expect(200);

    expect((all.body as SeasonalRateListDto).data.map((r) => r.name)).toEqual([
      'Majówka',
      'Lato',
      'Zima',
    ]);
    expect((filtered.body as SeasonalRateListDto).data.map((r) => r.name)).toEqual([
      'Lato',
      'Zima',
    ]);
  });

  describe('BR-09', () => {
    it('BR-09: an overlapping rate → 409 SEASONAL_RATE_OVERLAP with the conflicting rate', async () => {
      const existing = (await post(highSeason).expect(201)).body as SeasonalRateDto;

      const res = await post({
        ...highSeason,
        name: 'Sierpień',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-15',
      }).expect(409);

      expect(res.body).toMatchObject({
        code: 'SEASONAL_RATE_OVERLAP',
        details: { conflictingRateId: existing.id, conflictingRateName: 'Wysoki sezon' },
      });
    });

    it('BR-09: adjacent rates (31.08 / 01.09) do not overlap; another room is independent', async () => {
      await post(highSeason).expect(201);
      const otherRoom = await createRoom(ctx.prisma, { id: room.propertyId });

      await post({ ...highSeason, dateFrom: '2026-09-01', dateTo: '2026-09-30' }).expect(201);
      await post({ ...highSeason, dateFrom: '2026-06-01', dateTo: '2026-06-30' }).expect(201);
      await http()
        .post(`/api/v1/rooms/${otherRoom.id}/rates`)
        .set(bearer(token))
        .send(highSeason)
        .expect(201);
    });

    it('BR-09: PATCH into another rate → 409; extending a rate over its own range is fine', async () => {
      const summer = (await post(highSeason).expect(201)).body as SeasonalRateDto;
      const autumn = (
        await post({
          ...highSeason,
          name: 'Jesień',
          dateFrom: '2026-09-01',
          dateTo: '2026-10-31',
        }).expect(201)
      ).body as SeasonalRateDto;

      const res = await http()
        .patch(`/api/v1/rates/${autumn.id}`)
        .set(bearer(token))
        .send({ dateFrom: '2026-08-25', dateTo: '2026-10-31' })
        .expect(409);
      await http()
        .patch(`/api/v1/rates/${summer.id}`)
        .set(bearer(token))
        .send({ dateFrom: '2026-06-15', dateTo: '2026-08-31', pricePerNight: 48000 })
        .expect(200);

      expect(res.body).toMatchObject({ details: { conflictingRateName: 'Wysoki sezon' } });
    });

    it('BR-09: two concurrent overlapping POSTs → exactly one 201 (EXCLUDE constraint)', async () => {
      const results = await Promise.all([
        post({ ...highSeason, name: 'A' }),
        post({ ...highSeason, name: 'B', dateFrom: '2026-08-01' }),
        post({ ...highSeason, name: 'C', dateTo: '2026-07-15' }),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
      expect(
        results
          .filter((res) => res.status === 409)
          .map((res) => (res.body as ErrorResponseDto).code),
      ).toEqual(['SEASONAL_RATE_OVERLAP', 'SEASONAL_RATE_OVERLAP']);
      await expect(ctx.prisma.seasonalRate.count({ where: { roomId: room.id } })).resolves.toBe(1);
    });
  });

  it('PATCH changes fields; dateFrom and dateTo must be sent together (400)', async () => {
    const rate = (await post(highSeason).expect(201)).body as SeasonalRateDto;

    const res = await http()
      .patch(`/api/v1/rates/${rate.id}`)
      .set(bearer(token))
      .send({ name: 'Szczyt', minNights: null })
      .expect(200);
    const partial = await http()
      .patch(`/api/v1/rates/${rate.id}`)
      .set(bearer(token))
      .send({ dateTo: '2026-09-15' })
      .expect(400);

    expect(res.body).toMatchObject({ name: 'Szczyt', minNights: null, dateTo: '2026-08-31' });
    expect(fieldsOf(partial)).toContain('dateFrom');
  });

  it('DELETE → 204, then the rate is gone (404)', async () => {
    const rate = (await post(highSeason).expect(201)).body as SeasonalRateDto;

    await http().delete(`/api/v1/rates/${rate.id}`).set(bearer(token)).expect(204);

    await http()
      .patch(`/api/v1/rates/${rate.id}`)
      .set(bearer(token))
      .send({ name: 'X' })
      .expect(404);
  });

  it('BR-05: changing or deleting a rate does not change existing reservations', async () => {
    const rate = (await post(highSeason).expect(201)).body as SeasonalRateDto;
    const reservation = await createReservation(ctx.prisma, {
      room,
      guest: await createGuest(ctx.prisma, { id: room.propertyId }),
      checkIn: '2026-08-10',
      checkOut: '2026-08-14',
    });

    await http()
      .patch(`/api/v1/rates/${rate.id}`)
      .set(bearer(token))
      .send({ pricePerNight: 99000 })
      .expect(200);
    await http().delete(`/api/v1/rates/${rate.id}`).set(bearer(token)).expect(204);

    await expect(
      ctx.prisma.reservation.findUnique({ where: { id: reservation.id } }),
    ).resolves.toMatchObject({
      totalPrice: reservation.totalPrice,
      priceBreakdown: reservation.priceBreakdown,
    });
  });

  it('rates of a deleted room are not reachable (404)', async () => {
    const rate = await createSeasonalRate(ctx.prisma, room, {
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
    await http().delete(`/api/v1/rooms/${room.id}`).set(bearer(token)).expect(204);

    await http().get(`/api/v1/rooms/${room.id}/rates`).set(bearer(token)).expect(404);
    await http().delete(`/api/v1/rates/${rate.id}`).set(bearer(token)).expect(404);
  });
});
