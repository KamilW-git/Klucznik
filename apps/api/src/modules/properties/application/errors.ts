import { ApplicationError } from '../../../common/errors/application-error';

/** Slug zajęty przez inny obiekt (także usunięty). 409. */
export class SlugTakenError extends ApplicationError {
  readonly code = 'SLUG_TAKEN';

  constructor(slug: string) {
    super('Ten adres strony jest już zajęty.', { slug });
  }
}
