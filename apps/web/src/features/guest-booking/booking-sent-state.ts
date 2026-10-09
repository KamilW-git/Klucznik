import type {
  PublicReservationCreatedDto,
  PublicReservationCreatedDtoRoom,
} from '@klucznik/api-client';

/** Stan routera P3 → P4: odpowiedź `POST /public/properties/:slug/reservations` (bez tokenu). */
export interface BookingSentState {
  reservation: PublicReservationCreatedDto;
}

/** Stan z historii przeglądarki może być dowolny (np. po odświeżeniu lub z innej strony). */
export function isBookingSentState(state: unknown): state is BookingSentState {
  if (typeof state !== 'object' || state === null || !('reservation' in state)) return false;
  const reservation = state.reservation;
  return (
    typeof reservation === 'object' &&
    reservation !== null &&
    typeof (reservation as Partial<PublicReservationCreatedDto>).number === 'string' &&
    typeof (reservation as Partial<PublicReservationCreatedDto>).checkIn === 'string'
  );
}

/**
 * Nazwa pokoju z odpowiedzi. H-016: w `openapi.json` pole `room` jest obiektem bez schematu
 * (`{ [key]: unknown }`), choć API zwraca `{ name }` – do czasu poprawki kontraktu sprawdzamy typ.
 */
export function createdRoomName(room: PublicReservationCreatedDtoRoom): string | null {
  const name = room['name'];
  return typeof name === 'string' ? name : null;
}
