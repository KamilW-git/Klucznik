import type { CalendarDate } from '../../../common/domain/calendar-date';
import { DomainError, type DomainErrorCode } from '../../../common/domain/domain-error';
import type { StayRange } from '../../../common/domain/stay-range';
import { assertMinNights } from '../../pricing/domain/min-nights';
import { ReservationOverlapError } from '../../reservations/domain/errors';
import { assertBookable, assertCapacity } from '../../reservations/domain/reservation-policy';

/**
 * Element zajmujący termin pokoju. Rezerwacja: `dateFrom` = przyjazd, `dateTo` = wyjazd (`[)`).
 * Blokada: `dateFrom`–`dateTo` to noce włącznie.
 */
export interface Conflict {
  type: 'RESERVATION' | 'BLOCK';
  id: string;
  /** Numer rezerwacji; `null` dla blokady. */
  number: string | null;
  dateFrom: CalendarDate;
  dateTo: CalendarDate;
}

interface Bookable {
  isActive: boolean;
  deletedAt: Date | null;
}

export interface AvailabilityInput {
  room: Bookable & { capacity: number };
  property: Bookable;
  stay: StayRange;
  guests: number;
  /** Wynik `resolveMinNights` (BR-03). */
  minNights: number;
  /** Aktywne rezerwacje i blokady przecinające noce pobytu (BR-01). */
  conflicts: readonly Conflict[];
  /** Rezerwacja ręczna może pominąć BR-03 (Q-01). */
  ignoreMinNights?: boolean;
}

// BR-01: termin jest wolny, gdy żadna aktywna rezerwacja ani blokada nie obejmuje nocy pobytu.
export function assertNoConflicts(conflicts: readonly Conflict[]): void {
  if (conflicts.length > 0) {
    throw new ReservationOverlapError(conflicts);
  }
}

/**
 * Pierwsza niespełniona reguła dostępności albo `null`, w kolejności z docs/features/availability.md:
 * BR-13, BR-02, BR-03, BR-01. Daty pobytu (BR-04) sprawdza się wcześniej, bo bez nich nie ma wyceny.
 */
export function findAvailabilityViolation(input: AvailabilityInput): DomainError | null {
  const checks: (() => void)[] = [
    () => assertBookable(input.room, input.property), // BR-13
    () => assertCapacity(input.room, input.guests), // BR-02
    () => {
      if (!input.ignoreMinNights) {
        assertMinNights(input.stay, input.minNights); // BR-03
      }
    },
    () => assertNoConflicts(input.conflicts), // BR-01
  ];
  for (const check of checks) {
    try {
      check();
    } catch (error) {
      if (error instanceof DomainError) {
        return error;
      }
      throw error;
    }
  }
  return null;
}

export type UnavailableReason =
  'ROOM_NOT_BOOKABLE' | 'CAPACITY_EXCEEDED' | 'MIN_NIGHTS_NOT_MET' | 'OCCUPIED';

const REASON_BY_CODE: Partial<Record<DomainErrorCode, UnavailableReason>> = {
  ROOM_NOT_BOOKABLE: 'ROOM_NOT_BOOKABLE',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  MIN_NIGHTS_NOT_MET: 'MIN_NIGHTS_NOT_MET',
  RESERVATION_OVERLAP: 'OCCUPIED',
};

/** Powód niedostępności do raportu (wycena, dostępność publiczna) zamiast błędu. */
export function unavailableReasonOf(error: DomainError): UnavailableReason {
  const reason = REASON_BY_CODE[error.code];
  if (!reason) {
    throw new Error(`No availability reason for ${error.code}`, { cause: error });
  }
  return reason;
}
