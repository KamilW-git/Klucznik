import { ApplicationError } from '../../../common/errors/application-error';

/** Plik nie jest obrazem JPG, PNG ani WebP (sprawdzane po sygnaturze, Q-14). 415. */
export class UnsupportedFileTypeError extends ApplicationError {
  readonly code = 'UNSUPPORTED_FILE_TYPE';

  constructor() {
    super('Dozwolone są tylko zdjęcia JPG, PNG i WebP.', {
      allowed: ['image/jpeg', 'image/png', 'image/webp'],
    });
  }
}
