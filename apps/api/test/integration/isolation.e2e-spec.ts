import request from 'supertest';

import type { ErrorResponseDto } from '../../src/common/http/error-response.dto';
import type { PropertyListDto } from '../../src/modules/properties/http/property.dto';
import {
  createAdmin,
  createBlock,
  createOwner,
  createProperty,
  createRoom,
  createSeasonalRate,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { JPEG } from '../support/images';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

/**
 * BR-12 (ADR 0008): właściciel B nie widzi i nie zmienia zasobów właściciela A.
 * Cudzy zasób → 404 NOT_FOUND (jak nieistniejący), nigdy 403.
 */
describe('Data isolation between owners (BR-12)', () => {
  let ctx: TestApp;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;
  const ids = { property: '', room: '', photo: '', rate: '', block: '' };
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const ownerA = await createOwner(ctx.prisma);
    const ownerB = await createOwner(ctx.prisma);
    tokenA = accessTokenFor(ctx.app, ownerA);
    tokenB = accessTokenFor(ctx.app, ownerB);
    adminToken = accessTokenFor(ctx.app, await createAdmin(ctx.prisma));

    const property = await createProperty(ctx.prisma, ownerA, { name: 'Obiekt A' });
    await createProperty(ctx.prisma, ownerB, { name: 'Obiekt B' });
    const room = await createRoom(ctx.prisma, property);
    const photo = await http()
      .post(`/api/v1/rooms/${room.id}/photos`)
      .set(bearer(tokenA))
      .attach('file', JPEG, 'a.jpg')
      .expect(201);
    const rate = await createSeasonalRate(ctx.prisma, room, {
      dateFrom: '2026-07-01',
      dateTo: '2026-08-31',
    });
    const block = await createBlock(ctx.prisma, room, {
      dateFrom: '2026-09-10',
      dateTo: '2026-09-12',
    });
    Object.assign(ids, {
      property: property.id,
      room: room.id,
      photo: (photo.body as { id: string }).id,
      rate: rate.id,
      block: block.id,
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const crossOwnerRequests = (): [string, () => request.Test][] => [
    ['GET /properties/:id', () => http().get(`/api/v1/properties/${ids.property}`)],
    [
      'PATCH /properties/:id',
      () => http().patch(`/api/v1/properties/${ids.property}`).send({ name: 'Przejęty' }),
    ],
    [
      'GET /properties/:id/dashboard',
      () => http().get(`/api/v1/properties/${ids.property}/dashboard`),
    ],
    ['GET /properties/:id/rooms', () => http().get(`/api/v1/properties/${ids.property}/rooms`)],
    [
      'POST /properties/:id/rooms',
      () =>
        http()
          .post(`/api/v1/properties/${ids.property}/rooms`)
          .send({ name: 'Obcy pokój', capacity: 2, basePricePerNight: 10000 }),
    ],
    ['GET /rooms/:id', () => http().get(`/api/v1/rooms/${ids.room}`)],
    ['PATCH /rooms/:id', () => http().patch(`/api/v1/rooms/${ids.room}`).send({ capacity: 1 })],
    [
      'POST /properties/:id/photos',
      () => http().post(`/api/v1/properties/${ids.property}/photos`).attach('file', JPEG, 'x.jpg'),
    ],
    [
      'POST /rooms/:id/photos',
      () => http().post(`/api/v1/rooms/${ids.room}/photos`).attach('file', JPEG, 'x.jpg'),
    ],
    ['PATCH /photos/:id', () => http().patch(`/api/v1/photos/${ids.photo}`).send({ sortOrder: 0 })],
    ['GET /rooms/:id/rates', () => http().get(`/api/v1/rooms/${ids.room}/rates`)],
    [
      'POST /rooms/:id/rates',
      () =>
        http()
          .post(`/api/v1/rooms/${ids.room}/rates`)
          .send({ name: 'Obca', dateFrom: '2026-10-01', dateTo: '2026-10-31', pricePerNight: 1 }),
    ],
    [
      'PATCH /rates/:id',
      () => http().patch(`/api/v1/rates/${ids.rate}`).send({ pricePerNight: 1 }),
    ],
    ['GET /rooms/:id/blocks', () => http().get(`/api/v1/rooms/${ids.room}/blocks`)],
    [
      'POST /rooms/:id/blocks',
      () =>
        http()
          .post(`/api/v1/rooms/${ids.room}/blocks`)
          .send({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }),
    ],
    [
      'GET /rooms/:id/quote',
      () =>
        http().get(
          `/api/v1/rooms/${ids.room}/quote?checkIn=2026-08-14&checkOut=2026-08-16&guests=2`,
        ),
    ],
    [
      'GET /properties/:id/calendar',
      () => http().get(`/api/v1/properties/${ids.property}/calendar?from=2026-08-01&to=2026-08-31`),
    ],
    // Operacje niszczące na końcu: udany wyciek usunąłby zasób i zamaskował kolejne przypadki.
    ['DELETE /rates/:id', () => http().delete(`/api/v1/rates/${ids.rate}`)],
    ['DELETE /blocks/:id', () => http().delete(`/api/v1/blocks/${ids.block}`)],
    ['DELETE /photos/:id', () => http().delete(`/api/v1/photos/${ids.photo}`)],
    ['DELETE /rooms/:id', () => http().delete(`/api/v1/rooms/${ids.room}`)],
    ['DELETE /properties/:id', () => http().delete(`/api/v1/properties/${ids.property}`)],
  ];

  it.each(crossOwnerRequests().map(([name]) => [name]))(
    'BR-12: owner B → %s of owner A → 404 NOT_FOUND',
    async (name) => {
      const send = crossOwnerRequests().find(([candidate]) => candidate === name)![1];

      const res = await send().set(bearer(tokenB)).expect(404);

      expect((res.body as ErrorResponseDto).code).toBe('NOT_FOUND');
    },
  );

  it('BR-12: nothing of owner A changed after the attempts', async () => {
    await http().get(`/api/v1/properties/${ids.property}`).set(bearer(tokenA)).expect(200);
    const room = await http().get(`/api/v1/rooms/${ids.room}`).set(bearer(tokenA)).expect(200);
    expect(room.body).toMatchObject({ capacity: 4, photos: [{ id: ids.photo }] });
    const rates = await http()
      .get(`/api/v1/rooms/${ids.room}/rates`)
      .set(bearer(tokenA))
      .expect(200);
    const blocks = await http()
      .get(`/api/v1/rooms/${ids.room}/blocks`)
      .set(bearer(tokenA))
      .expect(200);
    expect(rates.body).toMatchObject({ data: [{ id: ids.rate, pricePerNight: 45000 }] });
    expect(blocks.body).toMatchObject({ data: [{ id: ids.block }] });
  });

  it('BR-12: GET /properties lists only own properties; ADMIN sees all', async () => {
    const own = await http().get('/api/v1/properties').set(bearer(tokenB)).expect(200);
    const all = await http().get('/api/v1/properties').set(bearer(adminToken)).expect(200);

    expect((own.body as PropertyListDto).data.map((p) => p.name)).toEqual(['Obiekt B']);
    expect((all.body as PropertyListDto).data.map((p) => p.name)).toEqual(['Obiekt A', 'Obiekt B']);
  });

  it('BR-12: ADMIN can read resources of any owner', async () => {
    await http().get(`/api/v1/properties/${ids.property}`).set(bearer(adminToken)).expect(200);
    await http().get(`/api/v1/rooms/${ids.room}`).set(bearer(adminToken)).expect(200);
  });
});
