/**
 * Błąd aplikacyjny: brak zasobu **albo** zasób innego właściciela (BR-12, 404 zamiast 403).
 * Rzucany przez serwisy i polityki dostępu, mapowany przez `AllExceptionsFilter` na 404 `NOT_FOUND`.
 */
export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(
    readonly resource: string,
    readonly id?: string,
  ) {
    super('Nie znaleziono zasobu.');
    this.name = 'NotFoundError';
  }
}
