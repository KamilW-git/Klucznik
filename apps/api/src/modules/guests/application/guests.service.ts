import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import { parseSort } from '../../../common/http/sort';
import {
  type GuestInput,
  type GuestListItem,
  GUESTS_REPOSITORY,
  type GuestSortField,
  type GuestsRepository,
} from './ports';

export interface ListGuestsInput extends PaginationQuery {
  q?: string;
  sort: string;
}

/** Goście obiektu (docs/features/guests.md). Dane gości są odizolowane między obiektami (BR-12). */
@Injectable()
export class GuestsService {
  constructor(
    @Inject(GUESTS_REPOSITORY) private readonly guests: GuestsRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
  ) {}

  async list(
    propertyId: string,
    scope: AccessScope,
    query: ListGuestsInput,
  ): Promise<Paginated<GuestListItem>> {
    const property = await this.ownership.assertProperty(propertyId, scope);
    const { items, total } = await this.guests.list({
      propertyId: property.id,
      q: query.q,
      sort: parseSort<GuestSortField>(query.sort),
      ...toSkipTake(query),
    });
    return paginate(items, query, total);
  }

  /**
   * Gość rezerwacji, w transakcji rezerwacji. Wywołujący sprawdził dostęp do obiektu.
   * - `{ id }`: gość musi należeć do obiektu, inaczej 404 (BR-12),
   * - dane z e-mailem: aktualizacja istniejącego gościa (Q-04) albo nowy rekord,
   * - dane bez e-maila (tylko `MANUAL`, Q-03): zawsze nowy rekord.
   */
  async resolveForReservation(propertyId: string, input: GuestInput): Promise<string> {
    if ('id' in input) {
      if (!(await this.guests.existsInProperty(input.id, propertyId))) {
        throw new NotFoundError('Guest', input.id);
      }
      return input.id;
    }

    const email = input.email?.trim().toLowerCase() || null;
    return email === null
      ? this.guests.create(propertyId, { ...input, email })
      : this.guests.upsertByEmail(propertyId, { ...input, email });
  }
}
