import type { CalendarDate } from '../../../common/domain/calendar-date';
import { DomainError } from '../../../common/domain/domain-error';
import { CancellationDeadlinePassedError } from './errors';
import { assertTransition, type ReservationStatus } from './reservation-status';

interface GuestCancellable {
  status: ReservationStatus;
  checkIn: CalendarDate;
}

// BR-08: ostatni dzień, w którym gość anuluje potwierdzoną rezerwację (włącznie).
// Przyjazd 14.08, 7 dni → do 07.08 włącznie.
export function guestCancellationDeadline(
  checkIn: CalendarDate,
  deadlineDays: number,
): CalendarDate {
  return checkIn.addDays(-deadlineDays);
}

/**
 * BR-06, BR-08: gość anuluje `PENDING` zawsze, a `CONFIRMED` najpóźniej w dniu terminu.
 * Inne statusy → `INVALID_STATUS_TRANSITION`; po terminie → `CANCELLATION_DEADLINE_PASSED`.
 */
export function assertGuestCanCancel(
  reservation: GuestCancellable,
  property: { cancellationDeadlineDays: number },
  today: CalendarDate,
): void {
  assertTransition(reservation.status, 'CANCELLED', 'GUEST');
  if (reservation.status === 'CONFIRMED') {
    const deadline = guestCancellationDeadline(
      reservation.checkIn,
      property.cancellationDeadlineDays,
    );
    if (today.isAfter(deadline)) {
      throw new CancellationDeadlinePassedError(deadline.toString());
    }
  }
}

// BR-08: `canCancel` dla widoku gościa (P5).
export function canGuestCancel(
  reservation: GuestCancellable,
  property: { cancellationDeadlineDays: number },
  today: CalendarDate,
): boolean {
  try {
    assertGuestCanCancel(reservation, property, today);
    return true;
  } catch (error) {
    if (error instanceof DomainError) {
      return false;
    }
    throw error;
  }
}
