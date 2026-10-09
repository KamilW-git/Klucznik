import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { InclusiveDateRange } from '../../../common/domain/date-range';

/** Pokój z danymi potrzebnymi do sprawdzenia dostępności i wyceny (BR-02, BR-03, BR-05, BR-13). */
export interface BookableRoom {
  id: string;
  propertyId: string;
  capacity: number;
  /** Grosze. */
  basePricePerNight: number;
  minNights: number;
  isActive: boolean;
  deletedAt: Date | null;
  property: { isActive: boolean; deletedAt: Date | null; currency: string };
}

/** Blokada terminu: noce **włącznie** (docs/architecture/data-model.md#availabilityblock-blokada-terminu). */
export interface AvailabilityBlock {
  id: string;
  roomId: string;
  nights: InclusiveDateRange;
  reason: string | null;
  createdAt: Date;
}

export interface BlockData {
  nights: InclusiveDateRange;
  reason: string | null;
}

/** Rezerwacja `PENDING`/`CONFIRMED`, która zajmuje termin (BR-01). */
export interface ActiveReservation {
  id: string;
  number: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
}

export interface CalendarReservation {
  id: string;
  roomId: string;
  number: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
  source: 'ONLINE' | 'MANUAL';
  guestName: string;
  guestsCount: number;
  /** Grosze. */
  totalPrice: number;
}

export interface Calendar {
  rooms: { id: string; name: string; isActive: boolean }[];
  reservations: CalendarReservation[];
  blocks: AvailabilityBlock[];
}

export interface AvailabilityRepository {
  /** Bez filtra `deletedAt`: dostęp i BR-13 sprawdza wywołujący. */
  findRoom(roomId: string): Promise<BookableRoom | null>;
  /** `SELECT … FOR UPDATE` na pokoju: ten sam zamek co BR-10 (rooms) i tworzenie rezerwacji (M7). */
  lockRoom(roomId: string): Promise<void>;
  /** BR-01: aktywne rezerwacje pokoju, których noce przecinają `nights`; sort `checkIn:asc`. */
  activeReservations(
    roomId: string,
    nights: InclusiveDateRange,
    excludeReservationId?: string,
  ): Promise<ActiveReservation[]>;
  /** Pokoje (bez usuniętych), rezerwacje `PENDING`/`CONFIRMED`/`COMPLETED` i blokady przecinające dni `[from, to]`. */
  calendar(propertyId: string, from: CalendarDate, to: CalendarDate): Promise<Calendar>;
}

export interface BlocksRepository {
  /** Blokady pokoju przecinające `[from, to]` (bez filtra: wszystkie); sort `dateFrom:asc`. */
  listByRoom(
    roomId: string,
    nights?: { from?: CalendarDate; to?: CalendarDate },
  ): Promise<AvailabilityBlock[]>;
  findById(id: string): Promise<AvailabilityBlock | null>;
  create(roomId: string, data: BlockData): Promise<AvailabilityBlock>;
  delete(id: string): Promise<void>;
}

export const AVAILABILITY_REPOSITORY = Symbol('AVAILABILITY_REPOSITORY');
export const BLOCKS_REPOSITORY = Symbol('BLOCKS_REPOSITORY');
