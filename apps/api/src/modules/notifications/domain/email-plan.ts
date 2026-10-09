/** Szablony e-maili (docs/features/notifications.md#szablony). */
export const EMAIL_TEMPLATES = [
  'reservation-received',
  'owner-new-reservation',
  'reservation-confirmed',
  'reservation-cancelled',
  'owner-reservation-cancelled',
  'reservation-expired',
  'stay-reminder',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export interface PlannedEmail {
  template: EmailTemplate;
  recipient: 'GUEST' | 'OWNER';
  /** Q-16: e-mail z linkiem `/r/:token` dostaje nowy token gościa. */
  withGuestLink: boolean;
}

/** Zdarzenie rezerwacji w postaci potrzebnej do planu (bez zależności od klas zdarzeń). */
export type NotifiableEvent =
  | { kind: 'created'; source: 'ONLINE' | 'MANUAL' }
  | { kind: 'confirmed' }
  | { kind: 'cancelled'; cancelledBy: 'GUEST' | 'OWNER' | 'ADMIN' | 'SYSTEM' }
  | { kind: 'expired' }
  | { kind: 'completed' }
  | { kind: 'reminder' };

const guest = (template: EmailTemplate, withGuestLink = false): PlannedEmail => ({
  template,
  recipient: 'GUEST',
  withGuestLink,
});
const owner = (template: EmailTemplate): PlannedEmail => ({
  template,
  recipient: 'OWNER',
  withGuestLink: false,
});

/**
 * Które e-maile wywołuje zdarzenie (tabela szablonów w docs/features/notifications.md).
 * Gość bez e-maila (rezerwacja ręczna, Q-03) nie dostaje żadnej wiadomości.
 */
export function planEmails(event: NotifiableEvent, guestHasEmail: boolean): PlannedEmail[] {
  const planned = ((): PlannedEmail[] => {
    switch (event.kind) {
      case 'created':
        return event.source === 'ONLINE'
          ? [guest('reservation-received', true), owner('owner-new-reservation')]
          : [guest('reservation-confirmed', true)];
      case 'confirmed':
        return [guest('reservation-confirmed', true)];
      case 'cancelled':
        return event.cancelledBy === 'GUEST'
          ? [guest('reservation-cancelled'), owner('owner-reservation-cancelled')]
          : [guest('reservation-cancelled')];
      case 'expired':
        return [guest('reservation-expired')];
      case 'completed':
        return []; // zdarzenie dla przyszłych opinii gości
      case 'reminder':
        return [guest('stay-reminder', true)];
    }
  })();
  return planned.filter((email) => email.recipient === 'OWNER' || guestHasEmail);
}

/** `<template>:<reservationId>`: każdy e-mail rezerwacji najwyżej raz. */
export function emailIdempotencyKey(template: EmailTemplate, reservationId: string): string {
  return `${template}:${reservationId}`;
}
