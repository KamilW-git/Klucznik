import { DomainError } from '../../../common/domain/domain-error';
import { PHOTO_LIMIT } from './photo-order';

/** Galeria obiektu lub pokoju ma już komplet zdjęć (Q-14). 422. */
export class PhotoLimitReachedError extends DomainError {
  readonly code = 'PHOTO_LIMIT_REACHED';

  constructor() {
    super(`Galeria może mieć najwyżej ${PHOTO_LIMIT} zdjęć.`, { limit: PHOTO_LIMIT });
  }
}
