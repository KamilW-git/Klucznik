import { CalendarDate } from '../../common/domain/calendar-date';
import type { Clock } from '../../common/domain/clock';

/** Produkcyjny zegar: czas systemowy, „dziś” w strefie aplikacji. */
export class SystemClock implements Clock {
  constructor(private readonly timeZone: string) {}

  now(): Date {
    return new Date();
  }

  today(): CalendarDate {
    return CalendarDate.fromInstant(this.now(), this.timeZone);
  }
}
