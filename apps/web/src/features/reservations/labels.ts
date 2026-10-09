import type {
  ActorType,
  ReservationEventDtoType,
  ReservationSource,
  ReservationStatus,
} from '@klucznik/api-client';

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  ONLINE: 'Online',
  MANUAL: 'Ręczna',
};

export const EVENT_LABELS: Record<ReservationEventDtoType, string> = {
  CREATED: 'Utworzono rezerwację',
  UPDATED: 'Zmieniono rezerwację',
  CONFIRMED: 'Potwierdzono',
  CANCELLED: 'Anulowano',
  EXPIRED: 'Wygasła (brak potwierdzenia)',
  COMPLETED: 'Zakończono pobyt',
};

export const ACTOR_LABELS: Record<ActorType, string> = {
  GUEST: 'Gość',
  OWNER: 'Właściciel',
  ADMIN: 'Administrator',
  SYSTEM: 'System',
};

/** Nazwy pól z `UPDATED.payload.fields` w historii zmian. */
export const FIELD_LABELS: Record<string, string> = {
  checkIn: 'przyjazd',
  checkOut: 'wyjazd',
  roomId: 'pokój',
  guestsCount: 'liczba gości',
  guestNotes: 'uwagi gościa',
  internalNotes: 'notatka wewnętrzna',
  totalPrice: 'cena',
};

/** Statusy, w których właściciel może jeszcze anulować / odrzucić rezerwację (BR-06). */
export function canCancel(status: ReservationStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

/** „Odrzuć” dla prośby `PENDING`, „Anuluj rezerwację” dla potwierdzonej. */
export function cancelLabel(status: ReservationStatus): string {
  return status === 'PENDING' ? 'Odrzuć' : 'Anuluj rezerwację';
}
