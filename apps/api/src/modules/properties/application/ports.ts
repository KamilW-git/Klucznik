export interface PropertySummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface AdminPropertyListItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  owner: { id: string; firstName: string; lastName: string; email: string };
  roomsCount: number;
  createdAt: Date;
}

export interface AdminPropertiesFilter {
  q?: string;
  ownerId?: string;
  isActive?: boolean;
  skip: number;
  take: number;
}

export interface PropertiesRepository {
  /** Zajęte slugi `base` i `base-*`, także obiektów usuniętych (slug nie jest używany ponownie). */
  findSlugsLike(base: string): Promise<Set<string>>;
  /** Rzuca `SlugTakenError` przy naruszeniu unikalności sluga. */
  create(input: { ownerId: string; name: string; slug: string }): Promise<PropertySummary>;
  listForAdmin(
    filter: AdminPropertiesFilter,
  ): Promise<{ items: AdminPropertyListItem[]; total: number }>;
}

export const PROPERTIES_REPOSITORY = Symbol('PROPERTIES_REPOSITORY');
