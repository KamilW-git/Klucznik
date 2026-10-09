import type { ReservationStatus } from '@klucznik/api-client';

/** Etykiety statusów według `glossary.md` (badge, filtry, historia zmian). */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Oczekuje',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  EXPIRED: 'Wygasła',
  COMPLETED: 'Zakończona',
};
