import { Prisma } from './generated/client';

/** Kody SQLSTATE PostgreSQL, które repozytoria tłumaczą na błędy domenowe. */
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
} as const;

export type PgErrorCode = (typeof PG_ERROR)[keyof typeof PG_ERROR];

export interface DatabaseError {
  /** SQLSTATE, np. `23P01`. */
  sqlState: string;
  /** Nazwa naruszonego constraintu lub indeksu, np. `reservations_no_overlap`. */
  constraint?: string;
}

interface DriverAdapterCause {
  originalCode?: unknown;
  originalMessage?: unknown;
  constraint?: { index?: unknown };
}

const CONSTRAINT_IN_MESSAGE = /constraint "([^"]+)"/;

/**
 * Wyciąga SQLSTATE i nazwę constraintu z błędu Prismy 7 (driver adapter `pg`).
 * Unique ma kod Prismy `P2002`, ale exclusion i check dostają ogólny `P2039`, więc rozpoznajemy je
 * po SQLSTATE z `meta.driverAdapterError.cause` (apps/api/docs/persistence-layer.md#repozytoria).
 */
export function databaseErrorOf(error: unknown): DatabaseError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return undefined;
  }
  const adapterError = error.meta?.driverAdapterError as { cause?: DriverAdapterCause } | undefined;
  const cause = adapterError?.cause;
  if (typeof cause?.originalCode !== 'string') {
    return undefined;
  }

  const index = cause.constraint?.index;
  const fromMessage =
    typeof cause.originalMessage === 'string'
      ? CONSTRAINT_IN_MESSAGE.exec(cause.originalMessage)?.[1]
      : undefined;
  return {
    sqlState: cause.originalCode,
    constraint: typeof index === 'string' ? index : fromMessage,
  };
}

/** Czy błąd to naruszenie constraintu o danym SQLSTATE (i opcjonalnie nazwie). */
export function isConstraintViolation(
  error: unknown,
  sqlState: PgErrorCode,
  constraint?: string,
): boolean {
  const dbError = databaseErrorOf(error);
  return (
    dbError?.sqlState === sqlState &&
    (constraint === undefined || dbError.constraint === constraint)
  );
}

/**
 * Konflikt unikalności lub wykluczenia, którego repozytorium nie przetłumaczyło na błąd domenowy.
 * Globalny filtr zwraca wtedy 409 `CONFLICT` i loguje ostrzeżenie (apps/api/docs/http-layer.md).
 */
export function isUnmappedConflict(error: unknown): boolean {
  const sqlState = databaseErrorOf(error)?.sqlState;
  return sqlState === PG_ERROR.UNIQUE_VIOLATION || sqlState === PG_ERROR.EXCLUSION_VIOLATION;
}
