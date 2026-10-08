import { ApplicationError } from '../../../common/errors/application-error';

/**
 * Zły e-mail, złe hasło **albo** zablokowane konto: zawsze ten sam błąd,
 * żeby nie ułatwiać enumeracji kont (docs/architecture/security.md#hasła).
 */
export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Nieprawidłowy e-mail lub hasło.');
  }
}

/** Brak, wygaśnięcie, unieważnienie lub ponowne użycie refresh tokenu; konto zablokowane lub usunięte. */
export class SessionInvalidError extends ApplicationError {
  readonly code = 'UNAUTHORIZED';

  constructor() {
    super('Sesja wygasła. Zaloguj się ponownie.');
  }
}
