import { CalendarDate } from '../../../common/domain/calendar-date';
import { assertEditable } from './editing-policy';
import { InvalidStatusTransitionError, ReservationNotEditableError } from './errors';
import { formatReservationNumber } from './reservation-number';
import {
  type ActorType,
  assertConfirmable,
  assertTransition,
  canTransition,
  isExpired,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from './reservation-status';

const d = (value: string): CalendarDate => CalendarDate.parse(value);

describe('reservation status machine', () => {
  it.each([
    ['PENDING', 'CONFIRMED', ['OWNER', 'ADMIN']],
    ['PENDING', 'CANCELLED', ['GUEST', 'OWNER', 'ADMIN']],
    ['PENDING', 'EXPIRED', ['SYSTEM']],
    ['CONFIRMED', 'CANCELLED', ['GUEST', 'OWNER', 'ADMIN']],
    ['CONFIRMED', 'COMPLETED', ['SYSTEM']],
  ] as const)('BR-06: %s → %s is allowed only for %j', (from, to, allowed) => {
    const actors: ActorType[] = ['GUEST', 'OWNER', 'ADMIN', 'SYSTEM'];
    for (const actor of actors) {
      expect(canTransition(from, to, actor)).toBe(
        (allowed as readonly ActorType[]).includes(actor),
      );
    }
  });

  it('BR-06: terminal statuses have no transitions', () => {
    const terminal: ReservationStatus[] = ['CANCELLED', 'EXPIRED', 'COMPLETED'];
    for (const from of terminal) {
      for (const to of RESERVATION_STATUSES) {
        expect(canTransition(from, to, 'ADMIN')).toBe(false);
      }
    }
  });

  it.each([
    ['CANCELLED', 'CONFIRMED', 'OWNER'],
    ['CONFIRMED', 'CONFIRMED', 'OWNER'],
    ['CONFIRMED', 'PENDING', 'ADMIN'],
    ['PENDING', 'CONFIRMED', 'GUEST'],
    ['PENDING', 'EXPIRED', 'OWNER'],
  ] as const)(
    'BR-06: %s → %s by %s → INVALID_STATUS_TRANSITION with details',
    (from, to, actor) => {
      expect(() => assertTransition(from, to, actor)).toThrow(InvalidStatusTransitionError);
      let error: unknown;
      try {
        assertTransition(from, to, actor);
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({ details: { from, to } });
    },
  );
});

describe('isExpired / assertConfirmable', () => {
  const expiresAt = new Date('2026-08-03T10:00:00Z');
  const pending = { status: 'PENDING' as const, expiresAt };

  it('BR-07: not expired a millisecond before expiresAt', () => {
    expect(isExpired(pending, new Date('2026-08-03T09:59:59.999Z'))).toBe(false);
  });

  it('BR-07: expired exactly at expiresAt (expiresAt == now)', () => {
    expect(isExpired(pending, expiresAt)).toBe(true);
  });

  it('BR-07: only PENDING with expiresAt can expire', () => {
    expect(isExpired({ status: 'CONFIRMED', expiresAt }, new Date('2026-09-01T00:00:00Z'))).toBe(
      false,
    );
    expect(
      isExpired({ status: 'PENDING', expiresAt: null }, new Date('2030-01-01T00:00:00Z')),
    ).toBe(false);
  });

  it('BR-07: confirming after expiresAt → INVALID_STATUS_TRANSITION even before the job runs', () => {
    expect(() => assertConfirmable(pending, 'OWNER', expiresAt)).toThrow(
      InvalidStatusTransitionError,
    );
    expect(() =>
      assertConfirmable(pending, 'OWNER', new Date('2026-08-03T09:00:00Z')),
    ).not.toThrow();
  });
});

describe('formatReservationNumber', () => {
  it('formats KL-YYYY-NNNNNN (Q-12)', () => {
    expect(formatReservationNumber(2026, 123)).toBe('KL-2026-000123');
    expect(formatReservationNumber(2027, 1)).toBe('KL-2027-000001');
  });
});

describe('assertEditable (Q-02)', () => {
  const today = d('2026-08-01');

  it('internalNotes can change in any status', () => {
    expect(() =>
      assertEditable({ status: 'COMPLETED', checkIn: d('2026-07-01') }, ['internalNotes'], today),
    ).not.toThrow();
  });

  it('other fields of a future PENDING/CONFIRMED reservation can change (check-in today included)', () => {
    expect(() =>
      assertEditable({ status: 'CONFIRMED', checkIn: today }, ['checkOut', 'guestsCount'], today),
    ).not.toThrow();
    expect(() =>
      assertEditable({ status: 'PENDING', checkIn: d('2026-08-20') }, ['roomId'], today),
    ).not.toThrow();
  });

  it.each([
    ['a stay that already started', 'CONFIRMED', '2026-07-31'],
    ['a cancelled reservation', 'CANCELLED', '2026-08-20'],
    ['a completed reservation', 'COMPLETED', '2026-08-20'],
  ] as const)('rejects changing dates of %s → RESERVATION_NOT_EDITABLE', (_, status, checkIn) => {
    expect(() =>
      assertEditable({ status, checkIn: d(checkIn) }, ['internalNotes', 'checkIn'], today),
    ).toThrow(ReservationNotEditableError);
  });
});
