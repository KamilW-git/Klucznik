import { Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { fromDbDate, toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { DashboardCounts, ReservationsQueryRepository } from '../application/ports';
import type { ReservationListItem } from '../application/read-models';

const LIST_ITEM_SELECT = {
  id: true,
  number: true,
  propertyId: true,
  checkIn: true,
  checkOut: true,
  guestsCount: true,
  totalPrice: true,
  currency: true,
  status: true,
  source: true,
  expiresAt: true,
  createdAt: true,
  room: { select: { id: true, name: true } },
  guest: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const satisfies Prisma.ReservationSelect;

type ListItemRow = Prisma.ReservationGetPayload<{ select: typeof LIST_ITEM_SELECT }>;

export function toListItem(row: ListItemRow): ReservationListItem {
  const checkIn = fromDbDate(row.checkIn);
  const checkOut = fromDbDate(row.checkOut);
  return {
    ...row,
    checkIn: checkIn.toString(),
    checkOut: checkOut.toString(),
    nights: checkOut.diffDays(checkIn),
  };
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

@Injectable()
export class PrismaReservationsQueryRepository
  extends PrismaRepository
  implements ReservationsQueryRepository
{
  countFutureActive(
    target: { propertyId: string } | { roomId: string },
    today: CalendarDate,
  ): Promise<number> {
    return this.db.reservation.count({
      where: { ...target, status: { in: [...ACTIVE_STATUSES] }, checkOut: { gt: toDbDate(today) } },
    });
  }

  async futureActiveByRoom(roomIds: string[], today: CalendarDate): Promise<Map<string, number>> {
    if (roomIds.length === 0) {
      return new Map();
    }
    const groups = await this.db.reservation.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        status: { in: [...ACTIVE_STATUSES] },
        checkOut: { gt: toDbDate(today) },
      },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.roomId, group._count._all]));
  }

  async dashboardCounts(propertyId: string, today: CalendarDate): Promise<DashboardCounts> {
    const [row] = await this.db.$queryRaw<
      { arrivals: bigint; departures: bigint; pending: bigint }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE status = 'CONFIRMED' AND check_in = ${today.toString()}::date) AS arrivals,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED' AND check_out = ${today.toString()}::date) AS departures,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
      FROM reservations
      WHERE property_id = ${propertyId}::uuid
    `;
    return {
      arrivalsToday: Number(row?.arrivals ?? 0),
      departuresToday: Number(row?.departures ?? 0),
      pendingCount: Number(row?.pending ?? 0),
    };
  }

  async occupiedNights(propertyId: string, from: CalendarDate, to: CalendarDate): Promise<number> {
    // Część wspólna zakresów `[)` daje liczbę nocy pobytu w okresie (różnica dat w PostgreSQL to dni).
    const [row] = await this.db.$queryRaw<{ nights: bigint | null }[]>`
      SELECT SUM(upper(overlap) - lower(overlap)) AS nights
      FROM (
        SELECT daterange(r.check_in, r.check_out, '[)')
               * daterange(${from.toString()}::date, ${to.toString()}::date, '[)') AS overlap
        FROM reservations r
        JOIN rooms ro ON ro.id = r.room_id
        WHERE r.property_id = ${propertyId}::uuid
          AND r.status IN ('CONFIRMED', 'COMPLETED')
          AND ro.is_active AND ro.deleted_at IS NULL
          AND daterange(r.check_in, r.check_out, '[)')
              && daterange(${from.toString()}::date, ${to.toString()}::date, '[)')
      ) AS stays
    `;
    return Number(row?.nights ?? 0);
  }

  activeRoomsCount(propertyId: string): Promise<number> {
    return this.db.room.count({ where: { propertyId, isActive: true, deletedAt: null } });
  }

  async occupiedRoomsPerDay(
    propertyId: string,
    from: CalendarDate,
    days: number,
  ): Promise<{ date: string; occupiedRooms: number }[]> {
    const rows = await this.db.$queryRaw<{ day: Date; occupied: bigint }[]>`
      SELECT d::date AS day, COUNT(DISTINCT r.room_id) AS occupied
      FROM generate_series(${from.toString()}::date, ${from.addDays(days - 1).toString()}::date, interval '1 day') AS d
      LEFT JOIN rooms ro
        ON ro.property_id = ${propertyId}::uuid AND ro.is_active AND ro.deleted_at IS NULL
      LEFT JOIN reservations r
        ON r.room_id = ro.id
       AND r.status IN ('CONFIRMED', 'COMPLETED')
       AND r.check_in <= d::date AND r.check_out > d::date
      GROUP BY d
      ORDER BY d
    `;
    return rows.map((row) => ({
      date: fromDbDate(row.day).toString(),
      occupiedRooms: Number(row.occupied),
    }));
  }

  async oldestPending(propertyId: string, limit: number): Promise<ReservationListItem[]> {
    const rows = await this.db.reservation.findMany({
      where: { propertyId, status: 'PENDING' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: LIST_ITEM_SELECT,
    });
    return rows.map(toListItem);
  }

  async confirmedArrivals(
    propertyId: string,
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<ReservationListItem[]> {
    const rows = await this.db.reservation.findMany({
      where: {
        propertyId,
        status: 'CONFIRMED',
        checkIn: { gte: toDbDate(from), lt: toDbDate(to) },
      },
      orderBy: [{ checkIn: 'asc' }, { number: 'asc' }],
      select: LIST_ITEM_SELECT,
    });
    return rows.map(toListItem);
  }
}
