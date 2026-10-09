import { CalendarDate } from '../../../common/domain/calendar-date';
import {
  assertGuestCanCancel,
  canGuestCancel,
  guestCancellationDeadline,
} from './cancellation-policy';
import { CancellationDeadlinePassedError, InvalidStatusTransitionError } from './errors';
import { isGuestTokenValid } from './guest-access-token';

const d = (value: string): CalendarDate => CalendarDate.parse(value);
const property = { cancellationDeadlineDays: 7 };
const confirmed = { status: 'CONFIRMED' as const, checkIn: d('2026-08-14') };

describe('cancellation policy', () => {
  it('BR-08: check-in 14.08 with 7 days → deadline 07.08 (inclusive)', () => {
    expect(guestCancellationDeadline(d('2026-08-14'), 7).toString()).toBe('2026-08-07');
  });

  it('BR-08: guest cancels CONFIRMED on the deadline day', () => {
    expect(() => assertGuestCanCancel(confirmed, property, d('2026-08-07'))).not.toThrow();
    expect(canGuestCancel(confirmed, property, d('2026-08-07'))).toBe(true);
  });

  it('BR-08: the day after the deadline → CANCELLATION_DEADLINE_PASSED with cancellableUntil', () => {
    expect(() => assertGuestCanCancel(confirmed, property, d('2026-08-08'))).toThrow(
      CancellationDeadlinePassedError,
    );
    expect(canGuestCancel(confirmed, property, d('2026-08-08'))).toBe(false);
    let error: unknown;
    try {
      assertGuestCanCancel(confirmed, property, d('2026-08-08'));
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ details: { cancellableUntil: '2026-08-07' } });
  });

  it('BR-08: PENDING can be cancelled by the guest at any time (even on check-in day)', () => {
    const pending = { status: 'PENDING' as const, checkIn: d('2026-08-14') };

    expect(canGuestCancel(pending, property, d('2026-08-14'))).toBe(true);
  });

  it('BR-08: deadline 0 days → until the check-in day', () => {
    expect(canGuestCancel(confirmed, { cancellationDeadlineDays: 0 }, d('2026-08-14'))).toBe(true);
    expect(canGuestCancel(confirmed, { cancellationDeadlineDays: 0 }, d('2026-08-15'))).toBe(false);
  });

  it.each(['CANCELLED', 'EXPIRED', 'COMPLETED'] as const)(
    'BR-06: guest cannot cancel a %s reservation → INVALID_STATUS_TRANSITION',
    (status) => {
      expect(() =>
        assertGuestCanCancel({ status, checkIn: d('2026-08-14') }, property, d('2026-08-01')),
      ).toThrow(InvalidStatusTransitionError);
    },
  );
});

describe('isGuestTokenValid (Q-11)', () => {
  it('is valid until check-out + 30 days inclusive', () => {
    expect(isGuestTokenValid(d('2026-08-18'), d('2026-09-17'))).toBe(true);
    expect(isGuestTokenValid(d('2026-08-18'), d('2026-09-18'))).toBe(false);
  });
});
