import { Injectable } from '@nestjs/common';

import { type AccessScope, ownerIdFilter } from '../../../common/access/access-scope';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import { Prisma } from '../../../infrastructure/prisma/generated/client';
import { isConstraintViolation, PG_ERROR } from '../../../infrastructure/prisma/prisma-errors';
import { fromDbDate, toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { ReservationListItem } from '../application/read-models';
import type {
  NewReservation,
  NewReservationEvent,
  NightPriceRecord,
  ReservationChanges,
  ReservationDetail,
  GuestReservationRecord,
  ReservationEventRecord,
  ReservationsFilter,
  ReservationsRepository,
  ReservationState,
} from '../application/reservation-ports';
import { ReservationOverlapError } from '../domain/errors';
import type { ReservationStatus } from '../domain/reservation-status';
import { LIST_ITEM_SELECT, toListItem } from './prisma-reservations-query.repository';

const DETAIL_SELECT = {
  ...LIST_ITEM_SELECT,
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  priceBreakdown: true,
  guestNotes: true,
  internalNotes: true,
  confirmedAt: true,
  cancelledAt: true,
  cancelledBy: true,
  cancellationReason: true,
  version: true,
  updatedAt: true,
  events: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      type: true,
      actorType: true,
      payload: true,
      createdAt: true,
      actorUser: { select: { firstName: true, lastName: true } },
    },
  },
} as const satisfies Prisma.ReservationSelect;

/** BR-12: rezerwacje obiektów właściciela (`ADMIN`: wszystkich); usunięty obiekt ukrywa rezerwacje. */
function accessibleWhere(scope: AccessScope): Prisma.ReservationWhereInput {
  return { property: { deletedAt: null, ownerId: ownerIdFilter(scope) } };
}

function toDbChanges(changes: ReservationChanges): Prisma.ReservationUncheckedUpdateManyInput {
  const { checkIn, checkOut, priceBreakdown, ...rest } = changes;
  return {
    ...rest,
    ...(checkIn && { checkIn: toDbDate(checkIn) }),
    ...(checkOut && { checkOut: toDbDate(checkOut) }),
    ...(priceBreakdown && { priceBreakdown: priceBreakdown as unknown as Prisma.InputJsonValue }),
  };
}

@Injectable()
export class PrismaReservationsRepository
  extends PrismaRepository
  implements ReservationsRepository
{
  async nextSequence(year: number): Promise<number> {
    // Q-12: atomowa inkrementacja licznika roku; wiersz roku powstaje przy pierwszej rezerwacji.
    const [row] = await this.db.$queryRaw<{ last_value: number }[]>`
      INSERT INTO reservation_counters (year, last_value) VALUES (${year}, 1)
      ON CONFLICT (year) DO UPDATE SET last_value = reservation_counters.last_value + 1
      RETURNING last_value
    `;
    return row!.last_value;
  }

  create(reservation: NewReservation): Promise<string> {
    return this.translateOverlap(async () => {
      const created = await this.db.reservation.create({
        data: {
          ...reservation,
          checkIn: toDbDate(reservation.checkIn),
          checkOut: toDbDate(reservation.checkOut),
          priceBreakdown: reservation.priceBreakdown as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return created.id;
    });
  }

  async findState(id: string, scope: AccessScope): Promise<ReservationState | null> {
    const row = await this.db.reservation.findFirst({
      where: { id, ...accessibleWhere(scope) },
      select: {
        id: true,
        propertyId: true,
        roomId: true,
        checkIn: true,
        checkOut: true,
        guestsCount: true,
        status: true,
        source: true,
        guestNotes: true,
        internalNotes: true,
        expiresAt: true,
        version: true,
      },
    });
    return row && { ...row, checkIn: fromDbDate(row.checkIn), checkOut: fromDbDate(row.checkOut) };
  }

  async findDetail(id: string, scope: AccessScope): Promise<ReservationDetail | null> {
    const row = await this.db.reservation.findFirst({
      where: { id, ...accessibleWhere(scope) },
      select: DETAIL_SELECT,
    });
    if (!row) {
      return null;
    }
    const { events, guest, priceBreakdown, ...rest } = row;
    return {
      ...toListItem({ ...rest, guest }),
      guest,
      priceBreakdown: priceBreakdown as unknown as NightPriceRecord[],
      guestNotes: rest.guestNotes,
      internalNotes: rest.internalNotes,
      confirmedAt: rest.confirmedAt,
      cancelledAt: rest.cancelledAt,
      cancelledBy: rest.cancelledBy,
      cancellationReason: rest.cancellationReason,
      version: rest.version,
      updatedAt: rest.updatedAt,
      events: events.map((event): ReservationEventRecord => ({
        type: event.type,
        actorType: event.actorType,
        actorName: event.actorUser
          ? `${event.actorUser.firstName} ${event.actorUser.lastName}`
          : null,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
    };
  }

  async findByGuestTokenHash(tokenHash: string): Promise<GuestReservationRecord | null> {
    const row = await this.db.reservation.findUnique({
      where: { guestAccessTokenHash: tokenHash },
      select: {
        id: true,
        number: true,
        status: true,
        checkIn: true,
        checkOut: true,
        guestsCount: true,
        totalPrice: true,
        currency: true,
        guestNotes: true,
        cancelledAt: true,
        room: { select: { id: true, name: true } },
        property: {
          select: {
            name: true,
            slug: true,
            phone: true,
            contactEmail: true,
            street: true,
            postalCode: true,
            city: true,
            checkInTime: true,
            checkOutTime: true,
            cancellationDeadlineDays: true,
          },
        },
      },
    });
    return row && { ...row, checkIn: fromDbDate(row.checkIn), checkOut: fromDbDate(row.checkOut) };
  }

  async list(filter: ReservationsFilter): Promise<{ items: ReservationListItem[]; total: number }> {
    const where: Prisma.ReservationWhereInput = {
      ...accessibleWhere(filter.scope),
      propertyId: filter.propertyId,
      roomId: filter.roomId,
      source: filter.source,
      ...(filter.statuses && { status: { in: filter.statuses } }),
      // Pobyt [checkIn, checkOut) ma noc w [from, to], gdy checkIn ≤ to i checkOut > from.
      ...(filter.to && { checkIn: { lte: toDbDate(filter.to) } }),
      ...(filter.from && { checkOut: { gt: toDbDate(filter.from) } }),
      ...(filter.q && {
        OR: [
          { number: { contains: filter.q, mode: 'insensitive' } },
          { guest: { lastName: { contains: filter.q, mode: 'insensitive' } } },
          { guest: { email: { contains: filter.q, mode: 'insensitive' } } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.db.reservation.findMany({
        where,
        // `id` jako ostatni klucz daje stabilną paginację przy równych wartościach.
        orderBy: [
          ...filter.sort.map(({ field, direction }) => ({ [field]: direction })),
          { id: 'asc' },
        ],
        skip: filter.skip,
        take: filter.take,
        select: LIST_ITEM_SELECT,
      }),
      this.db.reservation.count({ where }),
    ]);
    return { items: rows.map(toListItem), total };
  }

  updateIf(
    id: string,
    expected: { version?: number; status?: ReservationStatus },
    changes: ReservationChanges,
  ): Promise<boolean> {
    return this.translateOverlap(async () => {
      const { count } = await this.db.reservation.updateMany({
        where: { id, version: expected.version, status: expected.status },
        data: { ...toDbChanges(changes), version: { increment: 1 } },
      });
      return count === 1;
    });
  }

  async addEvent(event: NewReservationEvent): Promise<void> {
    await this.addEvents([event]);
  }

  async addEvents(events: readonly NewReservationEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.db.reservationEvent.createMany({
      data: events.map((event) => ({
        ...event,
        payload: event.payload as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  async setGuestTokenHash(id: string, tokenHash: string): Promise<void> {
    await this.db.reservation.update({ where: { id }, data: { guestAccessTokenHash: tokenHash } });
  }

  async expirePending(now: Date): Promise<string[]> {
    // BR-07, idempotencja: zapis warunkowy; równoległe potwierdzenie albo drugi przebieg joba nic nie zmienia.
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      UPDATE reservations
      SET status = 'EXPIRED', version = version + 1, updated_at = ${now}
      WHERE status = 'PENDING' AND expires_at <= ${now}
      RETURNING id
    `;
    return rows.map((row) => row.id);
  }

  async completeStays(today: CalendarDate): Promise<string[]> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      UPDATE reservations
      SET status = 'COMPLETED', version = version + 1, updated_at = now()
      WHERE status = 'CONFIRMED' AND check_out < ${today.toString()}::date
      RETURNING id
    `;
    return rows.map((row) => row.id);
  }

  async markRemindersDue(checkIn: CalendarDate, now: Date): Promise<string[]> {
    // Warunek `reminder_sent_at IS NULL` w tym samym UPDATE: drugi przebieg nie wyśle drugiego e-maila.
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      UPDATE reservations r
      SET reminder_sent_at = ${now}
      FROM guests g
      WHERE g.id = r.guest_id AND g.email IS NOT NULL
        AND r.status = 'CONFIRMED' AND r.check_in = ${checkIn.toString()}::date
        AND r.reminder_sent_at IS NULL
      RETURNING r.id
    `;
    return rows.map((row) => row.id);
  }

  /** BR-01: `EXCLUDE` w bazie łapie kolizję, której nie wykrył zamek (ostatnia linia obrony). */
  private async translateOverlap<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'reservations_no_overlap')) {
        throw new ReservationOverlapError();
      }
      throw error;
    }
  }
}
