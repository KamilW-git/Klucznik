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

/** BR-06, BR-07: przejście statusu niedozwolone dla aktora albo rezerwacja już wygasła (409). */
export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(from: string, to: string, details: Record<string, unknown> = {}) {
    super('Tej zmiany statusu nie można wykonać.', { from, to, ...details });
  }
}

/** Q-02: pola poza `internalNotes` można zmieniać tylko w przyszłej rezerwacji `PENDING`/`CONFIRMED` (409). */
export class ReservationNotEditableError extends DomainError {
  readonly code = 'RESERVATION_NOT_EDITABLE';

  constructor(fields: readonly string[]) {
    super('Tej rezerwacji nie można już zmienić (poza notatką wewnętrzną).', { fields });
  }
}

/** BR-11: rezerwację zmienił ktoś inny od czasu jej odczytu (409). */
export class VersionConflictError extends DomainError {
  readonly code = 'VERSION_CONFLICT';

  constructor() {
    super('Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane.');
  }
}
