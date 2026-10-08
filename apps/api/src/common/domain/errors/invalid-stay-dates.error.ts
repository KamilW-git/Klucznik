import { DomainError } from '../domain-error';

export type InvalidStayDatesReason =
  'CHECK_IN_IN_PAST' | 'CHECK_OUT_NOT_AFTER_CHECK_IN' | 'CHECK_IN_TOO_FAR' | 'STAY_TOO_LONG';

const MESSAGES: Record<InvalidStayDatesReason, string> = {
  CHECK_IN_IN_PAST: 'Data przyjazdu nie może być w przeszłości.',
  CHECK_OUT_NOT_AFTER_CHECK_IN: 'Data wyjazdu musi być późniejsza niż data przyjazdu.',
  CHECK_IN_TOO_FAR: 'Rezerwacja jest możliwa najwyżej 365 dni naprzód.',
  STAY_TOO_LONG: 'Pobyt może trwać najwyżej 30 nocy.',
};

/** BR-04: niepoprawne daty pobytu (422). `details.reason` mówi, który warunek nie jest spełniony. */
export class InvalidStayDatesError extends DomainError {
  readonly code = 'INVALID_STAY_DATES';

  constructor(
    readonly reason: InvalidStayDatesReason,
    details: Record<string, unknown> = {},
  ) {
    super(MESSAGES[reason], { reason, ...details });
  }
}
