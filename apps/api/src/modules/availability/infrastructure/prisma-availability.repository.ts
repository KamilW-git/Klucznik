import { Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { InclusiveDateRange } from '../../../common/domain/date-range';
import { fromDbDate, toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type {
  ActiveReservation,
  AvailabilityRepository,
  BookableRoom,
  Calendar,
} from '../application/ports';
import { BLOCK_SELECT, toBlock } from './prisma-blocks.repository';

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;
const CALENDAR_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED'] as const;

@Injectable()
export class PrismaAvailabilityRepository
  extends PrismaRepository
  implements AvailabilityRepository
{
  findRoom(roomId: string): Promise<BookableRoom | null> {
    return this.db.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        propertyId: true,
        capacity: true,
        basePricePerNight: true,
        minNights: true,
        isActive: true,
        deletedAt: true,
        property: { select: { isActive: true, deletedAt: true, currency: true } },
      },
    });
  }

  async lockRoom(roomId: string): Promise<void> {
    await this.db.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId}::uuid FOR UPDATE`;
  }

  async activeReservations(
    roomId: string,
    nights: InclusiveDateRange,
    excludeReservationId?: string,
  ): Promise<ActiveReservation[]> {
    // BR-01: pobyt [checkIn, checkOut) ma noc w [from, to], gdy checkIn ≤ to i checkOut > from.
    const rows = await this.db.reservation.findMany({
      where: {
        roomId,
        status: { in: [...ACTIVE_STATUSES] },
        checkIn: { lte: toDbDate(nights.to) },
        checkOut: { gt: toDbDate(nights.from) },
        ...(excludeReservationId && { id: { not: excludeReservationId } }),
      },
      orderBy: [{ checkIn: 'asc' }, { number: 'asc' }],
      select: { id: true, number: true, checkIn: true, checkOut: true },
    });
    return rows.map((row) => ({
      ...row,
      checkIn: fromDbDate(row.checkIn),
      checkOut: fromDbDate(row.checkOut),
    }));
  }

  async calendar(propertyId: string, from: CalendarDate, to: CalendarDate): Promise<Calendar> {
    const [rooms, reservations, blocks] = await Promise.all([
      this.db.room.findMany({
        where: { propertyId, deletedAt: null },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, isActive: true },
      }),
      this.db.reservation.findMany({
        where: {
          propertyId,
          status: { in: [...CALENDAR_STATUSES] },
          room: { deletedAt: null },
          checkIn: { lte: toDbDate(to) },
          checkOut: { gt: toDbDate(from) },
        },
        orderBy: [{ checkIn: 'asc' }, { number: 'asc' }],
        select: {
          id: true,
          roomId: true,
          number: true,
          checkIn: true,
          checkOut: true,
          status: true,
          source: true,
          guestsCount: true,
          totalPrice: true,
          guest: { select: { firstName: true, lastName: true } },
        },
      }),
      this.db.availabilityBlock.findMany({
        where: {
          room: { propertyId, deletedAt: null },
          dateFrom: { lte: toDbDate(to) },
          dateTo: { gte: toDbDate(from) },
        },
        orderBy: [{ dateFrom: 'asc' }, { id: 'asc' }],
        select: BLOCK_SELECT,
      }),
    ]);

    return {
      rooms,
      reservations: reservations.map(({ guest, ...row }) => ({
        ...row,
        // Filtr statusów wyżej zawęża typ, którego Prisma nie zna.
        status: row.status as (typeof CALENDAR_STATUSES)[number],
        checkIn: fromDbDate(row.checkIn),
        checkOut: fromDbDate(row.checkOut),
        guestName: `${guest.firstName} ${guest.lastName}`,
      })),
      blocks: blocks.map(toBlock),
    };
  }
}
