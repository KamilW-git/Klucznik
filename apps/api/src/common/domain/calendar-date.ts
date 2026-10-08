const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/**
 * Data kalendarzowa bez czasu i strefy (`YYYY-MM-DD`), ADR 0007.
 * Wewnętrznie liczba dni od 1970-01-01, więc arytmetyka nie zależy od strefy ani zmiany czasu.
 */
export class CalendarDate {
  private constructor(private readonly epochDay: number) {}

  /** Parsuje `YYYY-MM-DD`. Rzuca `RangeError` dla złego formatu lub nieistniejącej daty (np. 2026-02-30). */
  static parse(value: string): CalendarDate {
    const match = ISO_DATE.exec(value);
    if (!match) {
      throw new RangeError(`Invalid calendar date format: "${value}"`);
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const ms = Date.UTC(year, month - 1, day);
    const date = CalendarDate.fromEpochMs(ms);
    if (date.toString() !== value) {
      throw new RangeError(`Invalid calendar date: "${value}"`);
    }
    return date;
  }

  static isValid(value: string): boolean {
    try {
      CalendarDate.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /** Data kalendarzowa chwili `instant` w strefie `timeZone` (np. 23:30 UTC 31.07 → 2026-08-01 w Warszawie). */
  static fromInstant(instant: Date, timeZone: string): CalendarDate {
    // Format `en-CA` daje `YYYY-MM-DD`.
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
    return CalendarDate.parse(formatted);
  }

  private static fromEpochMs(ms: number): CalendarDate {
    return new CalendarDate(Math.floor(ms / MS_PER_DAY));
  }

  addDays(days: number): CalendarDate {
    return new CalendarDate(this.epochDay + days);
  }

  /** Liczba dni od `other` do `this` (`2026-08-18`.diffDays(`2026-08-14`) = 4). */
  diffDays(other: CalendarDate): number {
    return this.epochDay - other.epochDay;
  }

  compare(other: CalendarDate): -1 | 0 | 1 {
    return Math.sign(this.epochDay - other.epochDay) as -1 | 0 | 1;
  }

  equals(other: CalendarDate): boolean {
    return this.epochDay === other.epochDay;
  }

  isBefore(other: CalendarDate): boolean {
    return this.epochDay < other.epochDay;
  }

  isAfter(other: CalendarDate): boolean {
    return this.epochDay > other.epochDay;
  }

  /** Dzień tygodnia: 0 = niedziela … 6 = sobota (jak `Date#getUTCDay`). */
  dayOfWeek(): number {
    // 1970-01-01 był czwartkiem (4).
    return (((this.epochDay + 4) % 7) + 7) % 7;
  }

  /** Sobota lub niedziela. */
  isWeekend(): boolean {
    const day = this.dayOfWeek();
    return day === 0 || day === 6;
  }

  toString(): string {
    return new Date(this.epochDay * MS_PER_DAY).toISOString().slice(0, 10);
  }

  toJSON(): string {
    return this.toString();
  }
}
