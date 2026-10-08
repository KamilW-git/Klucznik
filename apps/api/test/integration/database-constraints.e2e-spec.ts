import type { Guest, Room } from '../../src/infrastructure/prisma/generated/client';
import { isConstraintViolation, PG_ERROR } from '../../src/infrastructure/prisma/prisma-errors';
import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import {
  createBlock,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
  createSeasonalRate,
} from '../factories';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

/**
 * Ostatnia linia obrony reguł w bazie (ręczny SQL z migracji `init_constraints`).
 * Testy sprawdzają constrainty bezpośrednio, bez serwisów, które pojawią się w M6–M7.
 */
describe('Database constraints', () => {
  let ctx: TestApp;
  let prisma: PrismaService;
  let room: Room;
  let guest: Guest;

  beforeAll(async () => {
    ctx = await createTestApp();
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const owner = await createOwner(prisma);
    const property = await createProperty(prisma, owner);
    room = await createRoom(prisma, property);
    guest = await createGuest(prisma, property);
  });

  const reserve = (
    checkIn: string,
    checkOut: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' = 'CONFIRMED',
  ) => createReservation(prisma, { room, guest, checkIn, checkOut, status });

  async function violation(promise: Promise<unknown>): Promise<unknown> {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error('Expected the database to reject the write');
  }

  describe('reservations_no_overlap', () => {
    it('BR-01: rejects an overlapping active reservation of the same room', async () => {
      await reserve('2026-08-14', '2026-08-18');

      const error = await violation(reserve('2026-08-17', '2026-08-20', 'PENDING'));

      expect(
        isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'reservations_no_overlap'),
      ).toBe(true);
    });

    it('BR-01: allows back-to-back stays (check-out day = next check-in day)', async () => {
      await reserve('2026-08-14', '2026-08-18');

      await expect(reserve('2026-08-18', '2026-08-21')).resolves.toBeDefined();
    });

    it.each(['CANCELLED', 'EXPIRED'] as const)(
      'BR-01: ignores %s reservations when checking overlap',
      async (status) => {
        await reserve('2026-08-14', '2026-08-18', status);

        await expect(reserve('2026-08-14', '2026-08-18')).resolves.toBeDefined();
      },
    );

    it('BR-01: allows the same dates in another room', async () => {
      await reserve('2026-08-14', '2026-08-18');
      const otherRoom = await createRoom(prisma, { id: room.propertyId });

      await expect(
        createReservation(prisma, {
          room: otherRoom,
          guest,
          checkIn: '2026-08-14',
          checkOut: '2026-08-18',
        }),
      ).resolves.toBeDefined();
    });

    it('BR-01: rejects reactivating a cancelled reservation into an occupied term', async () => {
      const cancelled = await reserve('2026-08-14', '2026-08-18', 'CANCELLED');
      await reserve('2026-08-15', '2026-08-16');

      const error = await violation(
        prisma.reservation.update({ where: { id: cancelled.id }, data: { status: 'CONFIRMED' } }),
      );

      expect(
        isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'reservations_no_overlap'),
      ).toBe(true);
    });
  });

  describe('seasonal_rates_no_overlap', () => {
    it('BR-09: rejects rates sharing a night (inclusive ranges)', async () => {
      await createSeasonalRate(prisma, room, { dateFrom: '2026-07-01', dateTo: '2026-08-31' });

      const error = await violation(
        createSeasonalRate(prisma, room, { dateFrom: '2026-08-31', dateTo: '2026-09-15' }),
      );

      expect(
        isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'seasonal_rates_no_overlap'),
      ).toBe(true);
    });

    it('BR-09: allows consecutive rates without a shared night', async () => {
      await createSeasonalRate(prisma, room, { dateFrom: '2026-07-01', dateTo: '2026-08-31' });

      await expect(
        createSeasonalRate(prisma, room, { dateFrom: '2026-09-01', dateTo: '2026-09-15' }),
      ).resolves.toBeDefined();
    });
  });

  describe('CHECK constraints', () => {
    it('BR-04: rejects check-out not after check-in', async () => {
      const error = await violation(reserve('2026-08-14', '2026-08-14'));

      expect(
        isConstraintViolation(error, PG_ERROR.CHECK_VIOLATION, 'reservations_check_dates'),
      ).toBe(true);
    });

    it('BR-02: rejects zero guests and zero room capacity', async () => {
      const guests = await violation(
        createReservation(prisma, {
          room,
          guest,
          checkIn: '2026-08-14',
          checkOut: '2026-08-15',
          guestsCount: 0,
        }),
      );
      const capacity = await violation(
        createRoom(prisma, { id: room.propertyId }, { capacity: 0 }),
      );

      expect(
        isConstraintViolation(guests, PG_ERROR.CHECK_VIOLATION, 'reservations_check_guests'),
      ).toBe(true);
      expect(
        isConstraintViolation(capacity, PG_ERROR.CHECK_VIOLATION, 'rooms_check_capacity'),
      ).toBe(true);
    });

    it('rejects a block ending before it starts, but allows overlapping blocks (Q-15)', async () => {
      const error = await violation(
        createBlock(prisma, room, { dateFrom: '2026-08-12', dateTo: '2026-08-10' }),
      );
      await createBlock(prisma, room, { dateFrom: '2026-08-10', dateTo: '2026-08-12' });

      expect(
        isConstraintViolation(error, PG_ERROR.CHECK_VIOLATION, 'availability_blocks_check_dates'),
      ).toBe(true);
      await expect(
        createBlock(prisma, room, { dateFrom: '2026-08-11', dateTo: '2026-08-13' }),
      ).resolves.toBeDefined();
    });
  });

  describe('unique constraints', () => {
    it('allows many guests without e-mail in one property (Q-03), but not duplicate e-mails', async () => {
      await createGuest(prisma, { id: room.propertyId }, { email: null });
      await createGuest(prisma, { id: room.propertyId }, { email: null });

      const error = await violation(
        createGuest(prisma, { id: room.propertyId }, { email: guest.email }),
      );

      expect(isConstraintViolation(error, PG_ERROR.UNIQUE_VIOLATION)).toBe(true);
    });
  });
});
