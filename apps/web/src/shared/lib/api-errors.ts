import { isApiError } from '@klucznik/api-client';

import { formatDate, pluralize } from './dates';

/**
 * Wszystkie kody błędów API (`api-conventions.md`, `business-rules.md#podsumowanie`)
 * oraz kody klienta (sieć, nieznana odpowiedź). Test pilnuje, że każdy ma komunikat.
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_TAKEN',
  'SLUG_TAKEN',
  'RESERVATION_OVERLAP',
  'BLOCK_OVERLAPS_RESERVATION',
  'CAPACITY_EXCEEDED',
  'MIN_NIGHTS_NOT_MET',
  'INVALID_STAY_DATES',
  'INVALID_STATUS_TRANSITION',
  'RESERVATION_NOT_EDITABLE',
  'CANCELLATION_DEADLINE_PASSED',
  'SEASONAL_RATE_OVERLAP',
  'HAS_FUTURE_RESERVATIONS',
  'VERSION_CONFLICT',
  'ROOM_NOT_BOOKABLE',
  'PHOTO_LIMIT_REACHED',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'NETWORK_ERROR',
  'UNKNOWN_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

type Details = Record<string, unknown>;
type MessageBuilder = string | ((details: Details) => string);

const GENERIC_ERROR = 'Coś poszło nie tak. Spróbuj ponownie.';

const STAY_DATES_REASONS: Record<string, string> = {
  CHECK_IN_IN_PAST: 'Data przyjazdu nie może być w przeszłości.',
  CHECK_OUT_NOT_AFTER_CHECK_IN: 'Data wyjazdu musi być późniejsza niż data przyjazdu.',
  CHECK_IN_TOO_FAR: 'Rezerwacja jest możliwa najwyżej 365 dni naprzód.',
  STAY_TOO_LONG: 'Pobyt może trwać najwyżej 30 nocy.',
};

export const API_ERROR_MESSAGES: Record<ApiErrorCode, MessageBuilder> = {
  VALIDATION_ERROR: 'Sprawdź poprawność formularza.',
  UNAUTHORIZED: 'Sesja wygasła. Zaloguj się ponownie.',
  INVALID_CREDENTIALS: 'Nieprawidłowy e-mail lub hasło.',
  FORBIDDEN: 'Nie masz uprawnień do tej operacji.',
  NOT_FOUND: 'Nie znaleziono – mogło zostać usunięte.',
  CONFLICT: 'Nie udało się zapisać zmian, bo dane są w konflikcie. Odśwież stronę.',
  EMAIL_TAKEN: 'Ten adres e-mail jest już używany.',
  SLUG_TAKEN: 'Ten adres strony jest już zajęty. Wybierz inny.',
  RESERVATION_OVERLAP: 'Ten termin koliduje z inną rezerwacją lub blokadą.',
  BLOCK_OVERLAPS_RESERVATION: (d) =>
    withSuffix('Ten termin obejmuje rezerwację', str(d['conflictingReservationNumber'])) +
    '. Najpierw ją anuluj lub przenieś.',
  CAPACITY_EXCEEDED: (d) =>
    typeof d['capacity'] === 'number'
      ? `Za dużo gości dla wybranego pokoju (najwyżej ${d['capacity']} os.).`
      : 'Za dużo gości dla wybranego pokoju.',
  MIN_NIGHTS_NOT_MET: (d) =>
    typeof d['minNights'] === 'number'
      ? `Minimalny pobyt w tym terminie: ${d['minNights']} ${pluralize(d['minNights'], 'noc', 'noce', 'nocy')}.`
      : 'Pobyt jest krótszy niż minimalny w tym terminie.',
  INVALID_STAY_DATES: (d) =>
    STAY_DATES_REASONS[str(d['reason']) ?? ''] ?? 'Sprawdź daty przyjazdu i wyjazdu.',
  INVALID_STATUS_TRANSITION: 'Tej operacji nie można wykonać w obecnym statusie rezerwacji.',
  RESERVATION_NOT_EDITABLE: 'Tej rezerwacji nie można już zmienić (poza notatką wewnętrzną).',
  CANCELLATION_DEADLINE_PASSED: (d) => {
    const until = str(d['cancellableUntil']);
    return until
      ? `Termin bezpłatnego anulowania minął ${formatDate(until)} – skontaktuj się z gospodarzem.`
      : 'Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem.';
  },
  SEASONAL_RATE_OVERLAP: (d) => {
    const name = str(d['conflictingRateName']);
    return name
      ? `Ta stawka nakłada się na stawkę „${name}”.`
      : 'Ta stawka nakłada się na inną stawkę sezonową.';
  },
  HAS_FUTURE_RESERVATIONS: (d) =>
    typeof d['count'] === 'number'
      ? `Nie można usunąć – istnieją przyszłe rezerwacje (${d['count']}).`
      : 'Nie można usunąć – istnieją przyszłe rezerwacje.',
  VERSION_CONFLICT: 'Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane.',
  ROOM_NOT_BOOKABLE: 'Ten pokój nie jest obecnie dostępny do rezerwacji.',
  PHOTO_LIMIT_REACHED: (d) =>
    typeof d['limit'] === 'number'
      ? `Galeria może mieć najwyżej ${d['limit']} zdjęć.`
      : 'Galeria ma już komplet zdjęć.',
  FILE_TOO_LARGE: 'Plik jest za duży.',
  UNSUPPORTED_FILE_TYPE: 'Nieobsługiwany typ pliku. Dodaj zdjęcie JPG, PNG lub WebP.',
  RATE_LIMITED: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  INTERNAL_ERROR: GENERIC_ERROR,
  SERVICE_UNAVAILABLE: 'Usługa jest chwilowo niedostępna. Spróbuj ponownie za chwilę.',
  NETWORK_ERROR: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
  UNKNOWN_ERROR: GENERIC_ERROR,
};

/** Komunikat po polsku dla dowolnego błędu (nigdy surowy `message` z serwera). */
export function getErrorMessage(error: unknown): string {
  if (!isApiError(error)) return GENERIC_ERROR;
  const builder = API_ERROR_MESSAGES[error.code as ApiErrorCode] as MessageBuilder | undefined;
  if (builder === undefined) return GENERIC_ERROR;
  return typeof builder === 'string' ? builder : builder(error.details ?? {});
}

/** `requestId` błędów 5xx do pokazania w toaście (zgłoszenie problemu). */
export function getRequestId(error: unknown): string | null {
  return isApiError(error) && error.status >= 500 ? error.requestId : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function withSuffix(text: string, suffix: string | undefined): string {
  return suffix ? `${text} ${suffix}` : text;
}
