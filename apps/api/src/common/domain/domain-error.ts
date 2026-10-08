/**
 * Kody błędów domenowych. Status HTTP dla każdego kodu jest w `common/errors/error-http-map.ts`
 * (kompilator wymusza wpis dla nowego kodu). Katalog: docs/architecture/business-rules.md#podsumowanie.
 */
export type DomainErrorCode =
  | 'RESERVATION_OVERLAP'
  | 'BLOCK_OVERLAPS_RESERVATION'
  | 'CAPACITY_EXCEEDED'
  | 'MIN_NIGHTS_NOT_MET'
  | 'INVALID_STAY_DATES'
  | 'INVALID_STATUS_TRANSITION'
  | 'RESERVATION_NOT_EDITABLE'
  | 'CANCELLATION_DEADLINE_PASSED'
  | 'SEASONAL_RATE_OVERLAP'
  | 'HAS_FUTURE_RESERVATIONS'
  | 'VERSION_CONFLICT'
  | 'ROOM_NOT_BOOKABLE'
  | 'PHOTO_LIMIT_REACHED';

/**
 * Bazowa klasa błędów domenowych. Domena nie zna HTTP: status nadaje globalny filtr.
 * `message` po polsku (pomocniczy dla UI), `details` to dane dla UI (np. `minNights`).
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
