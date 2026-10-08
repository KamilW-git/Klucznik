/**
 * Kody błędów aplikacyjnych, czyli spoza reguł domenowych BR (uwierzytelnianie, unikalność, dostęp).
 * Status HTTP dla każdego kodu jest w `error-http-map.ts` (kompilator wymusza wpis).
 * Katalog kodów ogólnych: docs/architecture/api-conventions.md#metody-i-kody-odpowiedzi.
 */
export type ApplicationErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'SLUG_TAKEN'
  | 'UNSUPPORTED_FILE_TYPE';

/**
 * Bazowa klasa błędów warstwy aplikacji. Jak `DomainError` nie zna HTTP: status nadaje globalny filtr.
 * `message` po polsku (pomocniczy dla UI), `details` to dane dla UI.
 */
export abstract class ApplicationError extends Error {
  abstract readonly code: ApplicationErrorCode;

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
