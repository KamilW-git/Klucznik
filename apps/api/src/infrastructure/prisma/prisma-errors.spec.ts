import { Prisma } from './generated/client';
import {
  databaseErrorOf,
  isConstraintViolation,
  isUnmappedConflict,
  PG_ERROR,
} from './prisma-errors';

/** Błąd w kształcie zwracanym przez Prismę 7 z adapterem `pg` (sprawdzone na PostgreSQL 16). */
function prismaError(code: string, cause: Record<string, unknown>): Error {
  return new Prisma.PrismaClientKnownRequestError('Invalid invocation', {
    code,
    clientVersion: '7.10.0',
    meta: { driverAdapterError: { name: 'DriverAdapterError', cause } },
  });
}

const uniqueEmail = prismaError('P2002', {
  originalCode: '23505',
  originalMessage: 'duplicate key value violates unique constraint "users_email_key"',
  kind: 'UniqueConstraintViolation',
  constraint: { index: 'users_email_key' },
});

const reservationOverlap = prismaError('P2039', {
  originalCode: '23P01',
  originalMessage: 'conflicting key value violates exclusion constraint "reservations_no_overlap"',
  kind: 'postgres',
});

describe('databaseErrorOf', () => {
  it('reads SQLSTATE and index name of a unique violation', () => {
    expect(databaseErrorOf(uniqueEmail)).toEqual({
      sqlState: '23505',
      constraint: 'users_email_key',
    });
  });

  it('reads constraint name of an exclusion violation from the message', () => {
    expect(databaseErrorOf(reservationOverlap)).toEqual({
      sqlState: '23P01',
      constraint: 'reservations_no_overlap',
    });
  });

  it('ignores errors that are not Prisma request errors', () => {
    expect(databaseErrorOf(new Error('boom'))).toBeUndefined();
    expect(databaseErrorOf(undefined)).toBeUndefined();
  });
});

describe('isConstraintViolation', () => {
  it('BR-01: recognizes reservations_no_overlap', () => {
    expect(
      isConstraintViolation(
        reservationOverlap,
        PG_ERROR.EXCLUSION_VIOLATION,
        'reservations_no_overlap',
      ),
    ).toBe(true);
    expect(
      isConstraintViolation(
        reservationOverlap,
        PG_ERROR.EXCLUSION_VIOLATION,
        'seasonal_rates_no_overlap',
      ),
    ).toBe(false);
  });

  it('matches any constraint when no name is given', () => {
    expect(isConstraintViolation(uniqueEmail, PG_ERROR.UNIQUE_VIOLATION)).toBe(true);
    expect(isConstraintViolation(uniqueEmail, PG_ERROR.EXCLUSION_VIOLATION)).toBe(false);
  });
});

describe('isUnmappedConflict', () => {
  it('treats unique and exclusion violations as conflicts', () => {
    expect(isUnmappedConflict(uniqueEmail)).toBe(true);
    expect(isUnmappedConflict(reservationOverlap)).toBe(true);
  });

  it('does not treat check violations as conflicts', () => {
    const check = prismaError('P2039', { originalCode: '23514', originalMessage: 'check' });
    expect(isUnmappedConflict(check)).toBe(false);
  });
});
