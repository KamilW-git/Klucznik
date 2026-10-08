import { CalendarDate } from './calendar-date';

/**
 * Zakres nocy **włącznie** `[from, to]` (stawki sezonowe, blokady), ADR 0007.
 * Blokada 10.08–12.08 obejmuje noce 10, 11 i 12.
 */
export class InclusiveDateRange {
  private constructor(
    readonly from: CalendarDate,
    readonly to: CalendarDate,
  ) {}

  /** Rzuca `RangeError`, gdy `to < from`. Kształt danych waliduje DTO (400) przed wejściem do domeny. */
  static of(from: CalendarDate, to: CalendarDate): InclusiveDateRange {
    if (to.isBefore(from)) {
      throw new RangeError(`Range end ${to.toString()} is before start ${from.toString()}`);
    }
    return new InclusiveDateRange(from, to);
  }

  /** Liczba nocy w zakresie (10.08–12.08 → 3). */
  nights(): number {
    return this.to.diffDays(this.from) + 1;
  }

  contains(date: CalendarDate): boolean {
    return !date.isBefore(this.from) && !date.isAfter(this.to);
  }
}

// BR-01 (blokady), BR-09 (stawki sezonowe): zakresy włączne nakładają się, gdy mają wspólną noc.
export function inclusiveRangesOverlap(a: InclusiveDateRange, b: InclusiveDateRange): boolean {
  return !a.from.isAfter(b.to) && !b.from.isAfter(a.to);
}
