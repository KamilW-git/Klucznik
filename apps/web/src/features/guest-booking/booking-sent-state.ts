import type { PublicReservationCreatedDto } from '@klucznik/api-client';

/** Stan routera P3 → P4: odpowiedź `POST /public/properties/:slug/reservations` (bez tokenu). */
export interface BookingSentState {
  reservation: PublicReservationCreatedDto;
}

/** Stan z historii przeglądarki może być dowolny (np. po odświeżeniu lub z innej strony). */
export function isBookingSentState(state: unknown): state is BookingSentState {
  if (typeof state !== 'object' || state === null || !('reservation' in state)) return false;
  const reservation = state.reservation;
  if (typeof reservation !== 'object' || reservation === null) return false;
  const candidate = reservation as Partial<PublicReservationCreatedDto>;
  return (
    typeof candidate.number === 'string' &&
    typeof candidate.checkIn === 'string' &&
    typeof candidate.room?.name === 'string'
  );
}
