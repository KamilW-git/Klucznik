import { Inject, Injectable } from '@nestjs/common';

import { type Clock, CLOCK } from '../../../common/domain/clock';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import { parseSort } from '../../../common/http/sort';
import { PASSWORD_HASHER, type PasswordHasher } from '../../../common/security/password-hasher';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { SessionsService } from '../../auth/application/sessions.service';
import {
  type NewPropertyInput,
  PropertiesService,
} from '../../properties/application/properties.service';
import {
  type OwnerChanges,
  type OwnerDetail,
  type OwnerListItem,
  OWNERS_REPOSITORY,
  type OwnerSortField,
  type OwnersRepository,
} from './ports';

const DAY_MS = 86_400_000;

export interface CreateOwnerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Obiekt zakładany w tej samej transakcji (Q-07). */
  property?: NewPropertyInput;
}

export interface UpdateOwnerInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface ListOwnersInput extends PaginationQuery {
  q?: string;
  isActive?: boolean;
  sort: string;
}

/** Zarządzanie kontami właścicieli przez admina (docs/features/admin-owners.md). */
@Injectable()
export class OwnersService {
  constructor(
    @Inject(OWNERS_REPOSITORY) private readonly owners: OwnersRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly properties: PropertiesService,
    private readonly sessions: SessionsService,
  ) {}

  async list(query: ListOwnersInput): Promise<Paginated<OwnerListItem>> {
    const { items, total } = await this.owners.list({
      q: query.q,
      isActive: query.isActive,
      sort: parseSort<OwnerSortField>(query.sort),
      since: this.windowStart(),
      ...toSkipTake(query),
    });
    return paginate(items, query, total);
  }

  async get(id: string): Promise<OwnerDetail> {
    const owner = await this.owners.findById(id, this.windowStart());
    if (!owner) {
      throw new NotFoundError('Owner', id);
    }
    return owner;
  }

  async create(input: CreateOwnerInput): Promise<OwnerDetail> {
    // argon2 jest wolny, więc hash liczymy przed otwarciem transakcji.
    const passwordHash = await this.hasher.hash(input.password);
    const id = await this.tx.run(async () => {
      const ownerId = await this.owners.create({
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      if (input.property) {
        await this.properties.createForOwner(ownerId, input.property);
      }
      return ownerId;
    });
    return this.get(id);
  }

  async update(id: string, input: UpdateOwnerInput): Promise<OwnerDetail> {
    const changes: OwnerChanges = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email?.toLowerCase(),
      isActive: input.isActive,
      passwordHash: input.password ? await this.hasher.hash(input.password) : undefined,
    };

    await this.tx.run(async () => {
      if (!(await this.owners.exists(id))) {
        throw new NotFoundError('Owner', id);
      }
      await this.owners.update(id, changes);
      // Q-10: blokada konta unieważnia wszystkie sesje (refresh tokeny).
      if (input.isActive === false) {
        await this.sessions.revokeAllForUser(id);
      }
    });
    return this.get(id);
  }

  /** `DELETE /admin/owners/:id`: dezaktywacja zamiast usunięcia (Q-10). */
  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  private windowStart(): Date {
    return new Date(this.clock.now().getTime() - 30 * DAY_MS);
  }
}
