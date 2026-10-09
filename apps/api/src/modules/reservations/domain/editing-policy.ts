import type { CalendarDate } from '../../../common/domain/calendar-date';
import { ReservationNotEditableError } from './errors';
import { ACTIVE_STATUSES, type ReservationStatus } from './reservation-status';

export type EditableField =
  'internalNotes' | 'guestNotes' | 'guestsCount' | 'roomId' | 'checkIn' | 'checkOut';

/**
 * Q-02: `internalNotes` można zmieniać zawsze. Pozostałe pola tylko w rezerwacji `PENDING`/`CONFIRMED`
 * z przyjazdem dziś lub później; inaczej `RESERVATION_NOT_EDITABLE` z listą zablokowanych pól.
 */
export function assertEditable(
  reservation: { status: ReservationStatus; checkIn: CalendarDate },
  changedFields: readonly EditableField[],
  today: CalendarDate,
): void {
  const restricted = changedFields.filter((field) => field !== 'internalNotes');
  if (restricted.length === 0) {
    return;
  }
  const editable =
    ACTIVE_STATUSES.includes(reservation.status) && !reservation.checkIn.isBefore(today);
  if (!editable) {
    throw new ReservationNotEditableError(restricted);
  }
}
