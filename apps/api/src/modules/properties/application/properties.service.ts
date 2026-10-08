import { Inject, Injectable } from '@nestjs/common';

import { type AccessScope, ownerIdFilter } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { assertNoFutureReservations } from '../../../common/domain/errors/has-future-reservations.error';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { type AppConfig, appConfig } from '../../../config/app.config';
import { PhotosService } from '../../photos/application/photos.service';
import type { Photo } from '../../photos/application/ports';
import type { Dashboard } from '../../reservations/application/read-models';
import { ReservationsQueryService } from '../../reservations/application/reservations-query.service';
import { firstFreeSlug, slugify } from '../domain/slug';
import { SlugTakenError } from './errors';
import {
  type AdminPropertyListItem,
  PROPERTIES_REPOSITORY,
  type PropertiesRepository,
  type Property,
  type PropertyListItem,
  type PropertySettings,
  type PropertySummary,
} from './ports';

export interface NewPropertyInput extends Partial<PropertySettings> {
  name: string;
  /** Jawny slug: zajęty → `SlugTakenError`. Brak: generowany z nazwy z sufiksem przy kolizji. */
  slug?: string;
}

export interface PropertyView extends Property {
  /** Zdjęcia obiektu (bez zdjęć pokoi); pierwsze to zdjęcie główne. */
  photos: Photo[];
  /** `${APP_PUBLIC_URL}/o/<slug>`. */
  publicUrl: string;
}

/** Obiekty (docs/features/properties.md). Dostęp: tylko własne obiekty, `ADMIN` wszystkie (BR-12). */
@Injectable()
export class PropertiesService {
  constructor(
    @Inject(PROPERTIES_REPOSITORY) private readonly properties: PropertiesRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
    private readonly photos: PhotosService,
    private readonly reservations: ReservationsQueryService,
  ) {}

  /** `OWNER`: własne obiekty. `ADMIN`: wszystkie albo jednego właściciela (`ownerId`). */
  list(scope: AccessScope, ownerId?: string): Promise<PropertyListItem[]> {
    return this.properties.list(ownerIdFilter(scope) ?? ownerId);
  }

  /** `ownerId` ustala kontroler: bieżący `OWNER` albo właściciel wskazany przez `ADMIN`. */
  async create(ownerId: string, input: NewPropertyInput): Promise<PropertyView> {
    if (!(await this.properties.ownerExists(ownerId))) {
      throw new NotFoundError('Owner', ownerId);
    }
    const { id } = await this.createForOwner(ownerId, input);
    return this.view(await this.findOrFail(id));
  }

  /**
   * Także w transakcji tworzenia właściciela (`POST /admin/owners`, Q-07).
   * Obiekt zakładany przez admina może nie mieć adresu (Q-13).
   */
  async createForOwner(ownerId: string, input: NewPropertyInput): Promise<PropertySummary> {
    const { slug: requested, ...settings } = input;
    if (requested) {
      await this.assertSlugFree(requested);
    }
    const slug = requested ?? (await this.freeSlugFor(input.name));
    return this.properties.create({ ...settings, ownerId, slug });
  }

  async get(id: string, scope: AccessScope): Promise<PropertyView> {
    await this.ownership.assertProperty(id, scope);
    return this.view(await this.findOrFail(id));
  }

  async update(
    id: string,
    scope: AccessScope,
    changes: Partial<PropertySettings> & { slug?: string },
  ): Promise<PropertyView> {
    const current = await this.ownership.assertProperty(id, scope);
    const property = await this.findOrFail(id);
    if (changes.slug && changes.slug !== property.slug) {
      await this.assertSlugFree(changes.slug);
    }

    await this.tx.run(async () => {
      // BR-10: dezaktywacja obiektu z przyszłymi rezerwacjami jest zablokowana.
      if (changes.isActive === false && current.isActive) {
        await this.properties.lock(id);
        assertNoFutureReservations(await this.reservations.countFutureActive({ propertyId: id }));
      }
      await this.properties.update(id, changes);
    });
    return this.view(await this.findOrFail(id));
  }

  /** Soft delete; slug pozostaje zajęty, historia rezerwacji zostaje (BR-10). */
  async delete(id: string, scope: AccessScope): Promise<void> {
    await this.ownership.assertProperty(id, scope);
    await this.tx.run(async () => {
      await this.properties.lock(id);
      assertNoFutureReservations(await this.reservations.countFutureActive({ propertyId: id })); // BR-10
      await this.properties.softDelete(id, this.clock.now());
    });
  }

  /** Pulpit O2 („dziś” z `Clock`), Q-08. */
  async dashboard(id: string, scope: AccessScope): Promise<Dashboard> {
    await this.ownership.assertProperty(id, scope);
    return this.reservations.dashboard(id);
  }

  async listForAdmin(
    query: PaginationQuery & { q?: string; ownerId?: string; isActive?: boolean },
  ): Promise<Paginated<AdminPropertyListItem>> {
    const { items, total } = await this.properties.listForAdmin({
      q: query.q,
      ownerId: query.ownerId,
      isActive: query.isActive,
      ...toSkipTake(query),
    });
    return paginate(items, query, total);
  }

  private async assertSlugFree(slug: string): Promise<void> {
    if ((await this.properties.findSlugsLike(slug)).has(slug)) {
      throw new SlugTakenError(slug);
    }
  }

  private async freeSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    return firstFreeSlug(base, await this.properties.findSlugsLike(base));
  }

  private async findOrFail(id: string): Promise<Property> {
    const property = await this.properties.findById(id);
    if (!property) {
      throw new NotFoundError('Property', id);
    }
    return property;
  }

  private async view(property: Property): Promise<PropertyView> {
    return {
      ...property,
      photos: await this.photos.listForProperty(property.id),
      publicUrl: `${this.config.publicUrl.replace(/\/+$/, '')}/o/${property.slug}`,
    };
  }
}
