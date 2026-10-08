import { ApplicationError } from './application-error';

/**
 * Brak zasobu **albo** zasób innego właściciela (BR-12, 404 zamiast 403).
 * Rzucany przez serwisy i polityki dostępu. `resource` i `id` służą tylko do logów, nie trafiają do odpowiedzi.
 */
export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';

  constructor(
    readonly resource: string,
    readonly id?: string,
  ) {
    super('Nie znaleziono zasobu.');
  }
}
