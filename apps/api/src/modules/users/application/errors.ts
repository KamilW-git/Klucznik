import { ApplicationError } from '../../../common/errors/application-error';

/** E-mail zajęty przez inne konto (właściciela lub admina). 409. */
export class EmailTakenError extends ApplicationError {
  readonly code = 'EMAIL_TAKEN';

  constructor() {
    super('Konto z tym adresem e-mail już istnieje.');
  }
}
