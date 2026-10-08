import { Inject, Injectable } from '@nestjs/common';

import { CalendarDate } from '../../../common/domain/calendar-date';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { RESERVATIONS_QUERY_REPOSITORY, type ReservationsQueryRepository } from './ports';
import type { Dashboard } from './read-models';

const PENDING_ON_DASHBOARD = 10;
const UPCOMING_ARRIVALS_DAYS = 7;
const OCCUPANCY_FORECAST_DAYS = 30;

/**
 * Eksportowany serwis odczytu rezerwacji dla `properties` i `rooms` (BR-10, pulpit).
 * Dostęp do obiektu sprawdza wywołujący (`OwnershipPolicy`); tu przychodzą już zweryfikowane id.
 */
@Injectable()
export class ReservationsQueryService {
  constructor(
    @Inject(RESERVATIONS_QUERY_REPOSITORY)
    private readonly reservations: ReservationsQueryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // BR-10: przyszłe aktywne rezerwacje blokują usunięcie i dezaktywację.
  countFutureActive(target: { propertyId: string } | { roomId: string }): Promise<number> {
    return this.reservations.countFutureActive(target, this.clock.today());
  }

  upcomingCountsByRoom(roomIds: string[]): Promise<Map<string, number>> {
    return this.reservations.futureActiveByRoom(roomIds, this.clock.today());
  }

  async dashboard(propertyId: string): Promise<Dashboard> {
    const today = this.clock.today();
    const monthStart = CalendarDate.parse(`${today.toString().slice(0, 8)}01`);
    const nextMonthStart = firstDayOfNextMonth(monthStart);
    const daysInMonth = nextMonthStart.diffDays(monthStart);

    const [counts, occupiedNights, totalRooms, pendingReservations, upcomingArrivals, perDay] =
      await Promise.all([
        this.reservations.dashboardCounts(propertyId, today),
        this.reservations.occupiedNights(propertyId, monthStart, nextMonthStart),
        this.reservations.activeRoomsCount(propertyId),
        this.reservations.oldestPending(propertyId, PENDING_ON_DASHBOARD),
        this.reservations.confirmedArrivals(
          propertyId,
          today,
          today.addDays(UPCOMING_ARRIVALS_DAYS),
        ),
        this.reservations.occupiedRoomsPerDay(propertyId, today, OCCUPANCY_FORECAST_DAYS),
      ]);

    const capacityNights = totalRooms * daysInMonth;
    return {
      ...counts,
      occupancyThisMonth:
        capacityNights === 0
          ? 0
          : Math.min(100, Math.round((occupiedNights * 100) / capacityNights)),
      pendingReservations,
      upcomingArrivals,
      occupancyNext30Days: perDay.map((day) => ({ ...day, totalRooms })),
    };
  }
}

function firstDayOfNextMonth(monthStart: CalendarDate): CalendarDate {
  // Dzień 1 + 31 dni zawsze wypada w następnym miesiącu; cofamy do jego pierwszego dnia.
  const inNextMonth = monthStart.addDays(31).toString();
  return CalendarDate.parse(`${inNextMonth.slice(0, 8)}01`);
}
