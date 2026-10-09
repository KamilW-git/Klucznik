import type { SortSpec } from '../../../common/http/sort';

export interface GuestData {
  firstName: string;
  lastName: string;
  /** Małe litery; `null` tylko dla rezerwacji ręcznej (Q-03). */
  email: string | null;
  phone: string | null;
}

/** Gość wskazany przy rezerwacji: istniejący (`MANUAL`) albo dane do upsertu (docs/features/guests.md). */
export type GuestInput = { id: string } | GuestData;

export interface GuestListItem extends GuestData {
  id: string;
  /** Wszystkie rezerwacje gościa w obiekcie. */
  reservationsCount: number;
  /** Najpóźniejszy przyjazd rezerwacji `CONFIRMED`/`COMPLETED` (`YYYY-MM-DD`) lub `null`. */
  lastStayAt: string | null;
  createdAt: Date;
}

export type GuestSortField = 'lastName' | 'createdAt' | 'lastStayAt';

export interface GuestsFilter {
  propertyId: string;
  q?: string;
  sort: SortSpec<GuestSortField>[];
  skip: number;
  take: number;
}

export interface GuestsRepository {
  list(filter: GuestsFilter): Promise<{ items: GuestListItem[]; total: number }>;
  existsInProperty(id: string, propertyId: string): Promise<boolean>;
  /** Gość bez e-maila: zawsze nowy rekord (Q-03). */
  create(propertyId: string, data: GuestData & { email: null }): Promise<string>;
  /**
   * Atomowy upsert po `(propertyId, email)` (`INSERT … ON CONFLICT DO UPDATE`): aktualizuje imię,
   * nazwisko i telefon (Q-04). Bez łapania `P2002`, które przerwałoby transakcję rezerwacji.
   */
  upsertByEmail(propertyId: string, data: GuestData & { email: string }): Promise<string>;
}

export const GUESTS_REPOSITORY = Symbol('GUESTS_REPOSITORY');
