import { Inject, Injectable } from '@nestjs/common';

import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import { firstFreeSlug, slugify } from '../domain/slug';
import { SlugTakenError } from './errors';
import {
  type AdminPropertyListItem,
  PROPERTIES_REPOSITORY,
  type PropertiesRepository,
  type PropertySummary,
} from './ports';

export interface NewPropertyInput {
  name: string;
  /** Jawny slug: zajęty → `SlugTakenError`. Brak: generowany z nazwy z sufiksem przy kolizji. */
  slug?: string;
}

/**
 * Obiekty (docs/features/properties.md). W M4 tylko tworzenie przy zakładaniu właściciela
 * i lista dla admina; pełny CRUD, izolacja (BR-12) i pulpit dochodzą w M5.
 */
@Injectable()
export class PropertiesService {
  constructor(@Inject(PROPERTIES_REPOSITORY) private readonly properties: PropertiesRepository) {}

  /** Wywoływane w transakcji tworzenia właściciela (`POST /admin/owners`, Q-07). Adres może być pusty (Q-13). */
  async createForOwner(ownerId: string, input: NewPropertyInput): Promise<PropertySummary> {
    const slug = input.slug ?? (await this.freeSlugFor(input.name));
    if (input.slug) {
      const taken = await this.properties.findSlugsLike(input.slug);
      if (taken.has(input.slug)) {
        throw new SlugTakenError(input.slug);
      }
    }
    return this.properties.create({ ownerId, name: input.name, slug });
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

  private async freeSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    return firstFreeSlug(base, await this.properties.findSlugsLike(base));
  }
}
