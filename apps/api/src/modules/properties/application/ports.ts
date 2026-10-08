export interface PropertySummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

/** Ustawienia obiektu edytowane przez właściciela (docs/features/properties.md). */
export interface PropertySettings {
  name: string;
  description: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  contactEmail: string | null;
  /** `HH:mm`. */
  checkInTime: string;
  /** `HH:mm`. */
  checkOutTime: string;
  /** BR-08. */
  cancellationDeadlineDays: number;
  /** BR-07. */
  pendingExpiryHours: number;
  isActive: boolean;
}

export interface Property extends PropertySettings {
  id: string;
  ownerId: string;
  slug: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyListItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  /** Pokoje bez usuniętych. */
  roomsCount: number;
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
  create(
    input: { ownerId: string; slug: string } & Partial<PropertySettings> & { name: string },
  ): Promise<PropertySummary>;
  /** Bez usuniętych; dostęp sprawdza wcześniej `OwnershipPolicy`. */
  findById(id: string): Promise<Property | null>;
  /** Bez usuniętych, sort po nazwie. `ownerId` undefined = wszystkie (ADMIN). */
  list(ownerId: string | undefined): Promise<PropertyListItem[]>;
  /** Rzuca `SlugTakenError` przy naruszeniu unikalności sluga. */
  update(id: string, changes: Partial<PropertySettings> & { slug?: string }): Promise<void>;
  softDelete(id: string, at: Date): Promise<void>;
  /** `SELECT … FOR UPDATE` na wierszu obiektu w bieżącej transakcji (BR-10). */
  lock(id: string): Promise<void>;
  /** Czy istnieje konto z rolą `OWNER` (obiekt zakładany przez admina). */
  ownerExists(ownerId: string): Promise<boolean>;
  listForAdmin(
    filter: AdminPropertiesFilter,
  ): Promise<{ items: AdminPropertyListItem[]; total: number }>;
}

export const PROPERTIES_REPOSITORY = Symbol('PROPERTIES_REPOSITORY');
