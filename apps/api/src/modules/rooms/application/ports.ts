export interface Room {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  capacity: number;
  /** Grosze. */
  basePricePerNight: number;
  minNights: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomData {
  name: string;
  description: string | null;
  capacity: number;
  basePricePerNight: number;
  minNights: number;
  isActive: boolean;
}

export interface RoomsRepository {
  /** Bez usuniętych; sort `name:asc`. */
  listByProperty(propertyId: string, includeInactive: boolean): Promise<Room[]>;
  /** Bez usuniętych (dostęp sprawdza `OwnershipPolicy`). */
  findById(id: string): Promise<Room | null>;
  create(propertyId: string, data: RoomData): Promise<Room>;
  update(id: string, changes: Partial<RoomData>): Promise<void>;
  softDelete(id: string, at: Date): Promise<void>;
  /**
   * `SELECT … FOR UPDATE` na wierszu pokoju w bieżącej transakcji. Ten sam zamek bierze tworzenie
   * rezerwacji (BR-01, M7), więc sprawdzenie BR-10 i usunięcie nie wyścigną się z nową rezerwacją.
   */
  lock(id: string): Promise<void>;
}

export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');
