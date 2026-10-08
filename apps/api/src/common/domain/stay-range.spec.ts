import { CalendarDate } from './calendar-date';
import { InclusiveDateRange } from './date-range';
import {
  InvalidStayDatesError,
  type InvalidStayDatesReason,
} from './errors/invalid-stay-dates.error';
import {
  assertStayDates,
  overlaps,
  overlapsBlock,
  StayRange,
  type StayDatesOptions,
} from './stay-range';

const d = (value: string): CalendarDate => CalendarDate.parse(value);
const stay = (checkIn: string, checkOut: string): StayRange =>
  StayRange.of(d(checkIn), d(checkOut));
const block = (from: string, to: string): InclusiveDateRange =>
  InclusiveDateRange.of(d(from), d(to));

function caught(fn: () => unknown): unknown {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error;
  }
}

function reasonOf(fn: () => unknown): InvalidStayDatesReason | undefined {
  const error = caught(fn);
  if (error !== undefined && !(error instanceof InvalidStayDatesError)) {
    throw new Error('Expected InvalidStayDatesError', { cause: error });
  }
  return error?.reason;
}

describe('StayRange', () => {
  it('counts nights of a half-open range ([14.08, 18.08) = 4 nights)', () => {
    expect(stay('2026-08-14', '2026-08-18').nights()).toBe(4);
  });

  it('lists each night without the check-out day', () => {
    expect(
      stay('2026-08-14', '2026-08-17')
        .eachNight()
        .map((night) => night.toString()),
    ).toEqual(['2026-08-14', '2026-08-15', '2026-08-16']);
  });

  it('converts to inclusive range of nights', () => {
    const nights = stay('2026-08-14', '2026-08-18').toNightsRange();
    expect([nights.from.toString(), nights.to.toString()]).toEqual(['2026-08-14', '2026-08-17']);
  });

  it.each([
    ['2026-08-14', '2026-08-14'],
    ['2026-08-14', '2026-08-13'],
  ])(
    'BR-04: rejects check-out %s → %s not after check-in (CHECK_OUT_NOT_AFTER_CHECK_IN)',
    (checkIn, checkOut) => {
      expect(reasonOf(() => stay(checkIn, checkOut))).toBe('CHECK_OUT_NOT_AFTER_CHECK_IN');
    },
  );
});

describe('overlaps', () => {
  it.each([
    // [a, b, kolizja]
    [['2026-08-14', '2026-08-18'], ['2026-08-17', '2026-08-20'], true], // przykład z BR-01
    [['2026-08-14', '2026-08-18'], ['2026-08-18', '2026-08-21'], false], // styk: wyjazd = przyjazd
    [['2026-08-14', '2026-08-18'], ['2026-08-10', '2026-08-14'], false], // styk z drugiej strony
    [['2026-08-14', '2026-08-18'], ['2026-08-15', '2026-08-16'], true], // zawieranie
    [['2026-08-14', '2026-08-18'], ['2026-08-14', '2026-08-18'], true], // ten sam termin
    [['2026-08-14', '2026-08-15'], ['2026-08-20', '2026-08-22'], false], // rozłączne
  ] as const)('BR-01: %j vs %j → %s', ([aIn, aOut], [bIn, bOut], expected) => {
    expect(overlaps(stay(aIn, aOut), stay(bIn, bOut))).toBe(expected);
    expect(overlaps(stay(bIn, bOut), stay(aIn, aOut))).toBe(expected);
  });
});

describe('overlapsBlock', () => {
  it.each([
    // blokada nocy 10.08–12.08 (włącznie)
    [['2026-08-12', '2026-08-14'], true], // przykład z BR-01: noc 12.08 zablokowana
    [['2026-08-13', '2026-08-15'], false], // przykład z BR-01: przyjazd 13.08 możliwy
    [['2026-08-08', '2026-08-10'], false], // wyjazd w dniu startu blokady
    [['2026-08-08', '2026-08-11'], true], // noc 10.08 zablokowana
    [['2026-08-11', '2026-08-12'], true], // w środku blokady
    [['2026-08-01', '2026-08-20'], true], // pobyt obejmuje całą blokadę
  ] as const)('BR-01: stay %j vs block 10.08–12.08 → %s', ([checkIn, checkOut], expected) => {
    expect(overlapsBlock(stay(checkIn, checkOut), block('2026-08-10', '2026-08-12'))).toBe(
      expected,
    );
  });
});

describe('assertStayDates', () => {
  const today = d('2026-08-01');

  const check = (
    checkIn: string,
    checkOut: string,
    options?: StayDatesOptions,
  ): InvalidStayDatesReason | undefined =>
    reasonOf(() => assertStayDates(stay(checkIn, checkOut), today, options));

  it('BR-04: accepts check-in today', () => {
    expect(check('2026-08-01', '2026-08-02')).toBeUndefined();
  });

  it('BR-04: rejects check-in in the past (CHECK_IN_IN_PAST)', () => {
    expect(check('2026-07-31', '2026-08-02')).toBe('CHECK_IN_IN_PAST');
  });

  it('BR-04: accepts check-in exactly 365 days ahead', () => {
    expect(check('2027-08-01', '2027-08-02')).toBeUndefined();
  });

  it('BR-04: rejects check-in 366 days ahead (CHECK_IN_TOO_FAR)', () => {
    expect(check('2027-08-02', '2027-08-03')).toBe('CHECK_IN_TOO_FAR');
  });

  it('BR-04: accepts a stay of exactly 30 nights', () => {
    expect(check('2026-08-10', '2026-09-09')).toBeUndefined();
  });

  it('BR-04: rejects a stay of 31 nights (STAY_TOO_LONG)', () => {
    expect(check('2026-08-10', '2026-09-10')).toBe('STAY_TOO_LONG');
  });

  it('BR-04: returns code and details with the reason for the UI', () => {
    const error = caught(() => assertStayDates(stay('2026-07-31', '2026-08-02'), today));

    expect(error).toBeInstanceOf(InvalidStayDatesError);
    expect(error).toMatchObject({
      code: 'INVALID_STAY_DATES',
      details: { reason: 'CHECK_IN_IN_PAST' },
    });
  });

  describe('manual reservation (Q-01: check-in up to 30 days back)', () => {
    const manual: StayDatesOptions = { allowPastCheckInDays: 30 };

    it('BR-04: accepts check-in 30 days in the past', () => {
      expect(check('2026-07-02', '2026-07-05', manual)).toBeUndefined();
    });

    it('BR-04: rejects check-in 31 days in the past (CHECK_IN_IN_PAST)', () => {
      expect(check('2026-07-01', '2026-07-05', manual)).toBe('CHECK_IN_IN_PAST');
    });

    it('BR-04: still limits the stay to 30 nights', () => {
      expect(check('2026-07-02', '2026-08-02', manual)).toBe('STAY_TOO_LONG');
    });
  });
});
