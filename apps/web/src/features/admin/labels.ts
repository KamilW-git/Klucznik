import type { EmailLogDtoTemplate, EmailStatus } from '@klucznik/api-client';

/** Status wysyłki e-maila (EmailLog, notifications.md). */
export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  QUEUED: 'W kolejce',
  SENT: 'Wysłany',
  FAILED: 'Błąd',
};

/** Szablony e-maili (7, notifications.md): treść i odbiorca. */
export const EMAIL_TEMPLATE_LABELS: Record<EmailLogDtoTemplate, string> = {
  'reservation-received': 'Prośba przyjęta (gość)',
  'owner-new-reservation': 'Nowa rezerwacja (gospodarz)',
  'reservation-confirmed': 'Potwierdzenie (gość)',
  'reservation-cancelled': 'Anulowanie (gość)',
  'owner-reservation-cancelled': 'Anulowanie (gospodarz)',
  'reservation-expired': 'Prośba wygasła (gość)',
  'stay-reminder': 'Przypomnienie o pobycie (gość)',
};
