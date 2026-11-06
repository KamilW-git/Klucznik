import {
  assertNoFutureReservations,
  HasFutureReservationsError,
} from './has-future-reservations.error';

describe('assertNoFutureReservations', () => {
  it('BR-10: passes when there are no future active reservations', () => {
    expect(() => assertNoFutureReservations(0)).not.toThrow();
  });

  it('BR-10: throws HAS_FUTURE_RESERVATIONS with the count for the UI', () => {
    let error: unknown;
    try {
      assertNoFutureReservations(3);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(HasFutureReservationsError);
    expect(error).toMatchObject({ code: 'HAS_FUTURE_RESERVATIONS', details: { count: 3 } });
  });
});
