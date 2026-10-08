import { CalendarDate } from './calendar-date';
import { InclusiveDateRange } from './date-range';
import { InvalidStayDatesError } from './errors/invalid-stay-dates.error';

/**
 * Pobyt jako zakres półotwarty `[checkIn, checkOut)`, ADR 0007.
 * Noce pobytu to `checkIn … checkOut − 1`, a dzień wyjazdu może być dniem przyjazdu kolejnego gościa.
 */
export class StayRange {
  private constructor(
    readonly checkIn: CalendarDate,
    readonly checkOut: CalendarDate,
  ) {}

  // BR-04: wyjazd musi być po przyjeździe. Pozostałe warunki BR-04 sprawdza `assertStayDates`.
  static of(checkIn: CalendarDate, checkOut: CalendarDate): StayRange {
    if (!checkOut.isAfter(checkIn)) {
      throw new InvalidStayDatesError('CHECK_OUT_NOT_AFTER_CHECK_IN', {
        checkIn: checkIn.toString(),
        checkOut: checkOut.toString(),
      });
    }
    return new StayRange(checkIn, checkOut);
  }

  /** `[14.08, 18.08)` → 4 noce. */
  nights(): number {
    return this.checkOut.diffDays(this.checkIn);
  }

  /** Kolejne noce pobytu (`[14.08, 16.08)` → 14.08, 15.08). Podstawa wyliczania ceny (BR-05). */
  eachNight(): CalendarDate[] {
    return Array.from({ length: this.nights() }, (_, i) => this.checkIn.addDays(i));
  }

  /** Noce pobytu jako zakres włączny (do porównań ze stawkami i blokadami). */
  toNightsRange(): InclusiveDateRange {
    return InclusiveDateRange.of(this.checkIn, this.checkOut.addDays(-1));
  }
}

// BR-01: pobyty kolidują, gdy mają wspólną noc. Styk (wyjazd = przyjazd) nie jest kolizją.
export function overlaps(a: StayRange, b: StayRange): boolean {
  return a.checkIn.isBefore(b.checkOut) && b.checkIn.isBefore(a.checkOut);
}

// BR-01: blokada `[from, to]` obejmuje noce włącznie, więc koliduje z pobytem, który ma noc w tym zakresie.
// Blokada 10.08–12.08 koliduje z [12.08, 14.08), a nie koliduje z [13.08, 15.08).
export function overlapsBlock(stay: StayRange, block: InclusiveDateRange): boolean {
  return !stay.checkIn.isAfter(block.to) && block.from.isBefore(stay.checkOut);
}

export const MAX_DAYS_AHEAD = 365;
export const MAX_NIGHTS = 30;

export interface StayDatesOptions {
  /**
   * Ile dni wstecz może być przyjazd. 0 dla rezerwacji online, 30 dla ręcznej (`MANUAL`). Q-01
   */
  allowPastCheckInDays?: number;
}

/**
 * BR-04: poprawne daty pobytu względem „dziś” (`Clock.today()`, Europe/Warsaw).
 * Warunek „wyjazd po przyjeździe” gwarantuje już `StayRange.of`.
 * Rzuca `InvalidStayDatesError` z `reason`: `CHECK_IN_IN_PAST`, `CHECK_IN_TOO_FAR`, `STAY_TOO_LONG`.
 */
export function assertStayDates(
  range: StayRange,
  today: CalendarDate,
  options: StayDatesOptions = {},
): void {
  const allowPastCheckInDays = options.allowPastCheckInDays ?? 0;
  const daysAhead = range.checkIn.diffDays(today);

  // Kolejność: najpierw termin przyjazdu (najczęstszy błąd gościa), potem długość pobytu.
  if (daysAhead < -allowPastCheckInDays) {
    throw new InvalidStayDatesError('CHECK_IN_IN_PAST', {
      today: today.toString(),
      allowPastCheckInDays,
    });
  }
  if (daysAhead > MAX_DAYS_AHEAD) {
    throw new InvalidStayDatesError('CHECK_IN_TOO_FAR', { maxDaysAhead: MAX_DAYS_AHEAD });
  }
  const nights = range.nights();
  if (nights > MAX_NIGHTS) {
    throw new InvalidStayDatesError('STAY_TOO_LONG', { nights, maxNights: MAX_NIGHTS });
  }
}
