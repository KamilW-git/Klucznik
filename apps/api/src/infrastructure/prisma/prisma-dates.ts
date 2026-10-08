import { CalendarDate } from '../../common/domain/calendar-date';

/**
 * Konwersja `CalendarDate` ↔ kolumna `DATE` (ADR 0007). Prisma reprezentuje `@db.Date` jako `Date`
 * o północy UTC, więc konwersja idzie przez UTC, nigdy przez strefę lokalną.
 */
export function toDbDate(date: CalendarDate): Date {
  return new Date(`${date.toString()}T00:00:00.000Z`);
}

export function fromDbDate(value: Date): CalendarDate {
  return CalendarDate.parse(value.toISOString().slice(0, 10));
}
