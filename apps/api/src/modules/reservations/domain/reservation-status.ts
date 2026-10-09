import { InvalidStatusTransitionError } from './errors';

export const RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_SOURCES = ['ONLINE', 'MANUAL'] as const;
export type ReservationSource = (typeof RESERVATION_SOURCES)[number];

export type ActorType = 'GUEST' | 'OWNER' | 'ADMIN' | 'SYSTEM';

/** Aktywne rezerwacje zajmują termin (BR-01) i blokują usunięcie pokoju (BR-10). */
export const ACTIVE_STATUSES: readonly ReservationStatus[] = ['PENDING', 'CONFIRMED'];

/**
 * BR-06: maszyna stanów jako dane (docs/architecture/data-model.md#maszyna-stanów-rezerwacji).
 * Anulowanie `CONFIRMED` przez gościa ogranicza dodatkowo BR-08.
 */
export const TRANSITIONS: ReadonlyArray<{
  from: ReservationStatus;
  to: ReservationStatus;
  actors: readonly ActorType[];
}> = [
  { from: 'PENDING', to: 'CONFIRMED', actors: ['OWNER', 'ADMIN'] },
  { from: 'PENDING', to: 'CANCELLED', actors: ['GUEST', 'OWNER', 'ADMIN'] },
  { from: 'PENDING', to: 'EXPIRED', actors: ['SYSTEM'] },
  { from: 'CONFIRMED', to: 'CANCELLED', actors: ['GUEST', 'OWNER', 'ADMIN'] },
  { from: 'CONFIRMED', to: 'COMPLETED', actors: ['SYSTEM'] },
];

export function canTransition(
  from: ReservationStatus,
  to: ReservationStatus,
  actor: ActorType,
): boolean {
  return TRANSITIONS.some(
    (transition) =>
      transition.from === from && transition.to === to && transition.actors.includes(actor),
  );
}

// BR-06
export function assertTransition(
  from: ReservationStatus,
  to: ReservationStatus,
  actor: ActorType,
): void {
  if (!canTransition(from, to, actor)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

// BR-07: `PENDING` wygasa w chwili `expiresAt` (granica włącznie), nawet zanim job zmieni status.
export function isExpired(
  reservation: { status: ReservationStatus; expiresAt: Date | null },
  now: Date,
): boolean {
  return (
    reservation.status === 'PENDING' &&
    reservation.expiresAt !== null &&
    reservation.expiresAt.getTime() <= now.getTime()
  );
}

// BR-06, BR-07: potwierdzić można tylko `PENDING`, która jeszcze nie wygasła.
export function assertConfirmable(
  reservation: { status: ReservationStatus; expiresAt: Date | null },
  actor: ActorType,
  now: Date,
): void {
  assertTransition(reservation.status, 'CONFIRMED', actor);
  if (isExpired(reservation, now)) {
    throw new InvalidStatusTransitionError(reservation.status, 'CONFIRMED', { expired: true });
  }
}
