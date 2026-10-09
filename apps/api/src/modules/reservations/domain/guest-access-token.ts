import type { CalendarDate } from '../../../common/domain/calendar-date';

/** Link `/r/:token` działa do `checkOut + 30 dni` (Q-11). */
export const GUEST_TOKEN_VALID_DAYS_AFTER_CHECK_OUT = 30;

// Q-11: ważność wyliczana z dat pobytu, bez osobnego pola.
export function isGuestTokenValid(checkOut: CalendarDate, today: CalendarDate): boolean {
  return !today.isAfter(checkOut.addDays(GUEST_TOKEN_VALID_DAYS_AFTER_CHECK_OUT));
}
