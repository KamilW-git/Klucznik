import type { AccessScope } from '../../../common/access/access-scope';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { SortSpec } from '../../../common/http/sort';
import type { ActorType, ReservationSource, ReservationStatus } from '../domain/reservation-status';
import type { ReservationListItem } from './read-models';

/** Zamrożona cena nocy (BR-05), kopia w `Reservation.priceBreakdown`. */
export interface NightPriceRecord {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Grosze. */
  price: number;
}

/** Stan rezerwacji potrzebny przypadkom użycia (bez relacji). */
export interface ReservationState {
  id: string;
  propertyId: string;
  roomId: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  guestsCount: number;
  status: ReservationStatus;
  source: ReservationSource;
  guestNotes: string | null;
  internalNotes: string | null;
  expiresAt: Date | null;
  version: number;
}

export interface NewReservation {
  number: string;
  propertyId: string;
  roomId: string;
  guestId: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  guestsCount: number;
  status: ReservationStatus;
  source: ReservationSource;
  totalPrice: number;
  currency: string;
  priceBreakdown: NightPriceRecord[];
  guestNotes: string | null;
  internalNotes: string | null;
  confirmedAt: Date | null;
  /** BR-07: tylko `PENDING`. */
  expiresAt: Date | null;
  /** SHA-256 tokenu gościa; surowy token tylko w linku z e-maila. */
  guestAccessTokenHash: string | null;
}

/** Rezerwacja widziana przez gościa z linku `/r/:token` (bez danych wewnętrznych). */
export interface GuestReservationRecord {
  id: string;
  number: string;
  status: ReservationStatus;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  guestsCount: number;
  totalPrice: number;
  currency: string;
  guestNotes: string | null;
  cancelledAt: Date | null;
  room: { id: string; name: string };
  property: {
    name: string;
    slug: string;
    phone: string | null;
    contactEmail: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    checkInTime: string;
    checkOutTime: string;
    cancellationDeadlineDays: number;
  };
}

export interface ReservationChanges {
  roomId?: string;
  checkIn?: CalendarDate;
  checkOut?: CalendarDate;
  guestsCount?: number;
  guestNotes?: string | null;
  internalNotes?: string | null;
  totalPrice?: number;
  priceBreakdown?: NightPriceRecord[];
  status?: ReservationStatus;
  expiresAt?: Date | null;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: ActorType;
  cancellationReason?: string | null;
}

export interface ReservationEventRecord {
  type: 'CREATED' | 'UPDATED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
  actorType: ActorType;
  /** Imię i nazwisko użytkownika (`OWNER`, `ADMIN`); `null` dla gościa i systemu. */
  actorName: string | null;
  payload: unknown;
  createdAt: Date;
}

/** Szczegóły rezerwacji (`ReservationDto`). */
export interface ReservationDetail extends Omit<ReservationListItem, 'guest'> {
  guest: ReservationListItem['guest'] & { phone: string | null };
  priceBreakdown: NightPriceRecord[];
  guestNotes: string | null;
  internalNotes: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: ActorType | null;
  cancellationReason: string | null;
  version: number;
  events: ReservationEventRecord[];
  updatedAt: Date;
}

export type ReservationSortField = 'checkIn' | 'createdAt' | 'number' | 'totalPrice';

export interface ReservationsFilter {
  scope: AccessScope;
  propertyId?: string;
  roomId?: string;
  statuses?: ReservationStatus[];
  source?: ReservationSource;
  /** Pobyt ma noc w `[from, to]`. */
  from?: CalendarDate;
  to?: CalendarDate;
  /** Nazwisko lub e-mail gościa albo numer rezerwacji. */
  q?: string;
  sort: SortSpec<ReservationSortField>[];
  skip: number;
  take: number;
}

export interface ReservationsRepository {
  /** Kolejny numer w roku z `ReservationCounter` (Q-12), w transakcji tworzenia. */
  nextSequence(year: number): Promise<number>;
  /** Naruszenie `reservations_no_overlap` → `ReservationOverlapError` (BR-01). */
  create(reservation: NewReservation): Promise<string>;
  /** Filtr właściciela w zapytaniu (BR-12); rezerwacje usuniętych obiektów → `null`. */
  findState(id: string, scope: AccessScope): Promise<ReservationState | null>;
  findDetail(id: string, scope: AccessScope): Promise<ReservationDetail | null>;
  findByGuestTokenHash(tokenHash: string): Promise<GuestReservationRecord | null>;
  list(filter: ReservationsFilter): Promise<{ items: ReservationListItem[]; total: number }>;
  /**
   * Zapis warunkowy `WHERE id AND version [AND status]` z `version + 1` (BR-06, BR-11).
   * `false`, gdy nic nie zmieniono (inna wersja lub status). Naruszenie BR-01 → `ReservationOverlapError`.
   */
  updateIf(
    id: string,
    expected: { version?: number; status?: ReservationStatus },
    changes: ReservationChanges,
  ): Promise<boolean>;
  addEvent(event: {
    reservationId: string;
    type: ReservationEventRecord['type'];
    actorType: ActorType;
    actorUserId: string | null;
    payload?: Record<string, unknown>;
  }): Promise<void>;
}

export const RESERVATIONS_REPOSITORY = Symbol('RESERVATIONS_REPOSITORY');
