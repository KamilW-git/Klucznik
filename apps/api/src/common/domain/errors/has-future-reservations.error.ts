import { DomainError } from '../domain-error';

/**
 * BR-10: obiektu ani pokoju z przyszłymi aktywnymi rezerwacjami (`PENDING`/`CONFIRMED`, `checkOut > dziś`)
 * nie można usunąć ani dezaktywować. 409, `details.count` dla komunikatu w UI.
 */
export class HasFutureReservationsError extends DomainError {
  readonly code = 'HAS_FUTURE_RESERVATIONS';

  constructor(count: number) {
    super('Najpierw anuluj lub zakończ przyszłe rezerwacje.', { count });
  }
}

// BR-10
export function assertNoFutureReservations(count: number): void {
  if (count > 0) {
    throw new HasFutureReservationsError(count);
  }
}
