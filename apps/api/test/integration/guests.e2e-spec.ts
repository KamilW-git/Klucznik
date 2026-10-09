import request from 'supertest';

import type { Property } from '../../src/infrastructure/prisma/generated/client';
import type { GuestPageDto } from '../../src/modules/guests/http/guest.dto';
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

describe('GET /properties/:id/guests', () => {
  let ctx: TestApp;
  let property: Property;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const list = async (query = ''): Promise<GuestPageDto> =>
    (
      await http()
        .get(`/api/v1/properties/${property.id}/guests?${query}`)
        .set(bearer(token))
        .expect(200)
    ).body as GuestPageDto;

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
    token = accessTokenFor(ctx.app, owner);
  });

  it('lists guests with reservation counts and the last stay, sorted by last name', async () => {
    const room = await createRoom(ctx.prisma, property);
    const zielinska = await createGuest(ctx.prisma, property, {
      firstName: 'Ewa',
      lastName: 'Zielińska',
      phone: '600700800',
    });
    const adamski = await createGuest(ctx.prisma, property, {
      firstName: 'Piotr',
      lastName: 'Adamski',
    });
    await createReservation(ctx.prisma, {
      room,
      guest: zielinska,
      checkIn: '2026-07-01',
      checkOut: '2026-07-03',
      status: 'COMPLETED',
    });
    await createReservation(ctx.prisma, {
      room,
      guest: zielinska,
      checkIn: '2026-08-10',
      checkOut: '2026-08-12',
    });
    await createReservation(ctx.prisma, {
      room,
      guest: zielinska,
      checkIn: '2026-09-10',
      checkOut: '2026-09-12',
      status: 'CANCELLED',
    });
    // Gość innego obiektu z tym samym e-mailem to osobny rekord (BR-12).
    const otherProperty = await createProperty(ctx.prisma, { id: property.ownerId });
    await createGuest(ctx.prisma, otherProperty, { email: zielinska.email });

    const page = await list();

    expect(page.meta.totalItems).toBe(2);
    expect(page.data).toEqual([
      expect.objectContaining({ id: adamski.id, reservationsCount: 0, lastStayAt: null }),
      expect.objectContaining({
        id: zielinska.id,
        firstName: 'Ewa',
        phone: '600700800',
        reservationsCount: 3,
        lastStayAt: '2026-08-10',
      }),
    ]);
  });

  it('searches first name, last name, e-mail and phone (q, min. 2 chars)', async () => {
    const a = await createGuest(ctx.prisma, property, {
      lastName: 'Kowalska',
      email: 'anna@example.com',
    });
    const b = await createGuest(ctx.prisma, property, {
      lastName: 'Nowak',
      phone: '+48 501 222 333',
    });
    await createGuest(ctx.prisma, property, { lastName: 'Wiśniewski' });

    expect((await list('q=KOWAL')).data.map((g) => g.id)).toEqual([a.id]);
    expect((await list('q=anna@')).data.map((g) => g.id)).toEqual([a.id]);
    expect((await list('q=501%20222')).data.map((g) => g.id)).toEqual([b.id]);
    expect((await list('q=a%25')).data).toEqual([]); // `%` dosłownie, nie jako wildcard
    await http().get(`/api/v1/properties/${property.id}/guests?q=a`).set(bearer(token)).expect(400);
  });

  it('sorts by lastStayAt desc with guests without stays last; paginates', async () => {
    const room = await createRoom(ctx.prisma, property);
    const early = await createGuest(ctx.prisma, property, { lastName: 'A' });
    const late = await createGuest(ctx.prisma, property, { lastName: 'B' });
    const never = await createGuest(ctx.prisma, property, { lastName: 'C' });
    await createReservation(ctx.prisma, {
      room,
      guest: early,
      checkIn: '2026-07-01',
      checkOut: '2026-07-02',
    });
    await createReservation(ctx.prisma, {
      room,
      guest: late,
      checkIn: '2026-08-01',
      checkOut: '2026-08-02',
    });

    expect((await list('sort=lastStayAt:desc')).data.map((g) => g.id)).toEqual([
      late.id,
      early.id,
      never.id,
    ]);
    const second = await list('sort=lastStayAt:asc&pageSize=2&page=2');
    expect(second.data.map((g) => g.id)).toEqual([never.id]);
    expect(second.meta).toMatchObject({ totalItems: 3, totalPages: 2 });
  });
});
