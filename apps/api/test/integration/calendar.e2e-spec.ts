import request from 'supertest';

import type { Property } from '../../src/infrastructure/prisma/generated/client';
import type { CalendarDto } from '../../src/modules/availability/http/calendar.dto';
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

describe('GET /properties/:id/calendar', () => {
  let ctx: TestApp;
  let property: Property;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const calendar = (query: string) =>
    http().get(`/api/v1/properties/${property.id}/calendar?${query}`).set(bearer(token));

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

  it('returns rooms, reservations and blocks intersecting the range in one response', async () => {
    const sosna = await createRoom(ctx.prisma, property, { name: 'Domek Sosna' });
    const brzoza = await createRoom(ctx.prisma, property, {
      name: 'Domek Brzoza',
      isActive: false,
    });
    const removed = await createRoom(ctx.prisma, property, { name: 'Stary domek' });
    await ctx.prisma.room.update({ where: { id: removed.id }, data: { deletedAt: new Date() } });
    const otherProperty = await createProperty(ctx.prisma, { id: property.ownerId });
    const foreignRoom = await createRoom(ctx.prisma, otherProperty);
    const guest = await createGuest(ctx.prisma, property, {
      firstName: 'Anna',
      lastName: 'Kowalska',
    });
    const reserve = (
      room: { id: string; propertyId: string; basePricePerNight: number },
      checkIn: string,
      checkOut: string,
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' = 'CONFIRMED',
    ) => createReservation(ctx.prisma, { room, guest, checkIn, checkOut, status, guestsCount: 3 });

    const across = await reserve(sosna, '2026-07-30', '2026-08-02', 'COMPLETED'); // przecina początek
    const pending = await reserve(brzoza, '2026-08-14', '2026-08-18', 'PENDING');
    const atEnd = await reserve(sosna, '2026-08-31', '2026-09-03'); // noc 31.08 w zakresie
    await reserve(sosna, '2026-07-28', '2026-08-01'); // wyjazd w pierwszym dniu: bez nocy w zakresie
    await reserve(sosna, '2026-09-03', '2026-09-05'); // po zakresie
    await reserve(sosna, '2026-08-10', '2026-08-12', 'CANCELLED');
    await reserve(brzoza, '2026-08-20', '2026-08-22', 'EXPIRED');
    await reserve(removed, '2026-08-05', '2026-08-07', 'COMPLETED');
    await reserve(foreignRoom, '2026-08-05', '2026-08-07');
    const block = await createBlock(ctx.prisma, sosna, {
      dateFrom: '2026-08-20',
      dateTo: '2026-08-22',
      reason: 'Remont',
    });
    const blockAtStart = await createBlock(ctx.prisma, brzoza, {
      dateFrom: '2026-07-25',
      dateTo: '2026-08-01',
    });
    await createBlock(ctx.prisma, sosna, { dateFrom: '2026-07-20', dateTo: '2026-07-31' });
    await createBlock(ctx.prisma, removed, { dateFrom: '2026-08-10', dateTo: '2026-08-12' });

    const res = await calendar('from=2026-08-01&to=2026-08-31').expect(200);
    const dto = res.body as CalendarDto;

    expect(dto.from).toBe('2026-08-01');
    expect(dto.to).toBe('2026-08-31');
    expect(dto.rooms).toEqual([
      { id: brzoza.id, name: 'Domek Brzoza', isActive: false },
      { id: sosna.id, name: 'Domek Sosna', isActive: true },
    ]);
    expect(dto.reservations.map((r) => r.id)).toEqual([across.id, pending.id, atEnd.id]);
    expect(dto.reservations[1]).toEqual({
      id: pending.id,
      roomId: brzoza.id,
      number: pending.number,
      checkIn: '2026-08-14',
      checkOut: '2026-08-18',
      status: 'PENDING',
      source: 'MANUAL',
      guestName: 'Anna Kowalska',
      guestsCount: 3,
      totalPrice: pending.totalPrice,
    });
    expect(dto.blocks).toEqual([
      {
        id: blockAtStart.id,
        roomId: brzoza.id,
        dateFrom: '2026-07-25',
        dateTo: '2026-08-01',
        reason: 'Remont',
      },
      {
        id: block.id,
        roomId: sosna.id,
        dateFrom: '2026-08-20',
        dateTo: '2026-08-22',
        reason: 'Remont',
      },
    ]);
  });

  it('returns empty lists for a property without rooms', async () => {
    const res = await calendar('from=2026-08-01&to=2026-08-14').expect(200);

    expect(res.body).toEqual({
      from: '2026-08-01',
      to: '2026-08-14',
      rooms: [],
      reservations: [],
      blocks: [],
    });
  });

  it('accepts at most 93 days (3 months)', async () => {
    await calendar('from=2026-08-01&to=2026-11-01').expect(200);
    await calendar('from=2026-08-01&to=2026-11-02').expect(400);
  });

  it.each([
    ['to before from', 'from=2026-08-31&to=2026-08-01'],
    ['missing to', 'from=2026-08-01'],
    ['invalid date', 'from=2026-08-01&to=2026-08-32'],
  ])('rejects %s (400)', async (_, query) => {
    await calendar(query).expect(400);
  });
});
