import { DomainError } from '../../../common/domain/domain-error';

/** BR-01: termin pokoju koliduje z aktywną rezerwacją lub blokadą (409). `details.conflicts` dla UI. */
export class ReservationOverlapError extends DomainError {
  readonly code = 'RESERVATION_OVERLAP';

  constructor(conflicts: readonly unknown[] = []) {
    super('Pokój jest zajęty w wybranym terminie.', { conflicts });
  }
}

/** BR-02: więcej gości niż pojemność pokoju (422). */
export class CapacityExceededError extends DomainError {
  readonly code = 'CAPACITY_EXCEEDED';

  constructor(capacity: number, guestsCount: number) {
    super(`Pokój mieści najwyżej ${capacity} os.`, { capacity, guestsCount });
  }
}

/** BR-13: pokój albo obiekt jest nieaktywny lub usunięty (422). */
export class RoomNotBookableError extends DomainError {
  readonly code = 'ROOM_NOT_BOOKABLE';

  constructor() {
    super('Ten pokój nie jest dostępny do rezerwacji.');
  }
}
