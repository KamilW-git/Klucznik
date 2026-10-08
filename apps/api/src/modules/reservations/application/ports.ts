import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { ReservationListItem } from './read-models';

export interface DashboardCounts {
  arrivalsToday: number;
  departuresToday: number;
  pendingCount: number;
}

/** Zapytania do odczytu rezerwacji dla innych modułów (pełny moduł rezerwacji: M7). */
export interface ReservationsQueryRepository {
  /** BR-10: aktywne (`PENDING`/`CONFIRMED`) z `checkOut > today`. */
  countFutureActive(
    target: { propertyId: string } | { roomId: string },
    today: CalendarDate,
  ): Promise<number>;
  futureActiveByRoom(roomIds: string[], today: CalendarDate): Promise<Map<string, number>>;
  dashboardCounts(propertyId: string, today: CalendarDate): Promise<DashboardCounts>;
  /** Noce rezerwacji `CONFIRMED`/`COMPLETED` aktywnych pokoi przecinające `[from, to)`. */
  occupiedNights(propertyId: string, from: CalendarDate, to: CalendarDate): Promise<number>;
  activeRoomsCount(propertyId: string): Promise<number>;
  /** Liczba zajętych aktywnych pokoi w każdym dniu `[from, from + days)`. */
  occupiedRoomsPerDay(
    propertyId: string,
    from: CalendarDate,
    days: number,
  ): Promise<{ date: string; occupiedRooms: number }[]>;
  oldestPending(propertyId: string, limit: number): Promise<ReservationListItem[]>;
  confirmedArrivals(
    propertyId: string,
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<ReservationListItem[]>;
}

export const RESERVATIONS_QUERY_REPOSITORY = Symbol('RESERVATIONS_QUERY_REPOSITORY');
