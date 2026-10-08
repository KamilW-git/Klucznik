import type { SortSpec } from '../../../common/http/sort';

export interface OwnerListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  /** Obiekty bez usuniętych. */
  propertiesCount: number;
  /** Rezerwacje utworzone w ostatnich 30 dniach we wszystkich obiektach właściciela. */
  reservationsLast30Days: number;
  createdAt: Date;
}

export interface OwnerDetail extends OwnerListItem {
  properties: { id: string; name: string; slug: string; isActive: boolean }[];
}

export type OwnerSortField = 'createdAt' | 'lastName';

export interface OwnersFilter {
  q?: string;
  isActive?: boolean;
  sort: SortSpec<OwnerSortField>[];
  skip: number;
  take: number;
  /** Początek okna `reservationsLast30Days`. */
  since: Date;
}

export interface NewOwner {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export type OwnerChanges = Partial<NewOwner & { isActive: boolean }>;

/** Konta z rolą `OWNER` (admin zarządza tylko nimi; konto admina jest poza zasięgiem → 404). */
export interface OwnersRepository {
  list(filter: OwnersFilter): Promise<{ items: OwnerListItem[]; total: number }>;
  findById(id: string, since: Date): Promise<OwnerDetail | null>;
  exists(id: string): Promise<boolean>;
  /** Rzuca `EmailTakenError` przy zajętym e-mailu. Zwraca id. */
  create(owner: NewOwner): Promise<string>;
  /** Rzuca `EmailTakenError` przy zajętym e-mailu. */
  update(id: string, changes: OwnerChanges): Promise<void>;
}

export const OWNERS_REPOSITORY = Symbol('OWNERS_REPOSITORY');
