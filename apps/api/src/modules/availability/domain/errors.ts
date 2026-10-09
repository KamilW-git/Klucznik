import { DomainError } from '../../../common/domain/domain-error';

/**
 * BR-01, Q-15: blokada obejmuje noc aktywnej rezerwacji (409). Właściciel musi najpierw anulować
 * lub przenieść rezerwację; `details` wskazuje pierwszą kolidującą rezerwację.
 */
export class BlockOverlapsReservationError extends DomainError {
  readonly code = 'BLOCK_OVERLAPS_RESERVATION';

  constructor(reservation: { id: string; number: string }) {
    super(`Termin obejmuje rezerwację ${reservation.number}.`, {
      conflictingReservationId: reservation.id,
      conflictingReservationNumber: reservation.number,
    });
  }
}
