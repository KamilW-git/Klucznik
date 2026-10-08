import { CalendarDate } from './calendar-date';

export const DEFAULT_TIME_ZONE = 'Europe/Warsaw';

/** Źródło czasu. Logika nigdy nie używa `new Date()` ani `Date.now()`, ADR 0007. */
export interface Clock {
  /** Bieżąca chwila (UTC). */
  now(): Date;
  /** Dzisiejsza data w strefie aplikacji (`APP_TIMEZONE`, domyślnie Europe/Warsaw). */
  today(): CalendarDate;
}

/** Token DI portu `Clock`. Produkcyjny adapter: `infrastructure/clock/system-clock.ts`. */
export const CLOCK = Symbol('CLOCK');

/** Zegar zatrzymany w podanej chwili. Do testów jednostkowych i integracyjnych. */
export class FixedClock implements Clock {
  private instant: Date;

  constructor(
    instant: Date,
    private readonly timeZone: string = DEFAULT_TIME_ZONE,
  ) {
    this.instant = new Date(instant.getTime());
  }

  /** `FixedClock.at('2026-08-01T10:00:00+02:00')`. */
  static at(iso: string, timeZone: string = DEFAULT_TIME_ZONE): FixedClock {
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) {
      throw new RangeError(`Invalid ISO timestamp: "${iso}"`);
    }
    return new FixedClock(instant, timeZone);
  }

  now(): Date {
    // Kopia, żeby wywołujący nie zmienił stanu zegara.
    return new Date(this.instant.getTime());
  }

  today(): CalendarDate {
    return CalendarDate.fromInstant(this.instant, this.timeZone);
  }

  /** Przesuwa zegar (np. test wygaszania `PENDING`, BR-07). */
  advanceBy(ms: number): void {
    this.instant = new Date(this.instant.getTime() + ms);
  }

  setTo(iso: string): void {
    this.instant = FixedClock.at(iso, this.timeZone).now();
  }
}
