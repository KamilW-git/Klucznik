import type { CalendarDate } from '../../../common/domain/calendar-date';

/** Obiekt na stronie publicznej: tylko aktywny i nieusunięty (BR-13), bez danych wewnętrznych. */
export interface PublicProperty {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  contactEmail: string | null;
  checkInTime: string;
  checkOutTime: string;
  cancellationDeadlineDays: number;
  pendingExpiryHours: number;
  currency: string;
}

export interface PublicRoom {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  minNights: number;
  /** Grosze: minimum z ceny bazowej i stawek kończących się dziś lub później. */
  priceFrom: number;
}

export interface PublicPropertiesRepository {
  findBySlug(slug: string): Promise<PublicProperty | null>;
  /** Aktywne, nieusunięte pokoje (BR-13), sort `name:asc`, z `priceFrom` liczonym od `today`. */
  listRooms(propertyId: string, today: CalendarDate): Promise<PublicRoom[]>;
}

export const PUBLIC_PROPERTIES_REPOSITORY = Symbol('PUBLIC_PROPERTIES_REPOSITORY');
