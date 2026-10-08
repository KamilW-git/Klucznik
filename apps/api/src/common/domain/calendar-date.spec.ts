import { CalendarDate } from './calendar-date';

const d = (value: string): CalendarDate => CalendarDate.parse(value);

describe('CalendarDate', () => {
  describe('parse', () => {
    it('round-trips a valid YYYY-MM-DD date', () => {
      expect(d('2026-08-14').toString()).toBe('2026-08-14');
    });

    it('accepts 29 February in a leap year', () => {
      expect(d('2028-02-29').toString()).toBe('2028-02-29');
    });

    it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31'])(
      'rejects non-existent date %s',
      (value) => {
        expect(() => d(value)).toThrow(RangeError);
      },
    );

    it.each(['2026-8-14', '14.08.2026', '2026-08-14T00:00:00Z', '', ' 2026-08-14'])(
      'rejects wrong format "%s"',
      (value) => {
        expect(() => d(value)).toThrow(RangeError);
      },
    );

    it('isValid reports validity without throwing', () => {
      expect(CalendarDate.isValid('2026-08-14')).toBe(true);
      expect(CalendarDate.isValid('2026-02-30')).toBe(false);
    });
  });

  describe('arithmetic', () => {
    it('adds days across month and year boundaries', () => {
      expect(d('2026-08-31').addDays(1).toString()).toBe('2026-09-01');
      expect(d('2026-12-31').addDays(1).toString()).toBe('2027-01-01');
      expect(d('2026-03-01').addDays(-1).toString()).toBe('2026-02-28');
    });

    it('is not affected by DST change in Poland (last Sunday of March / October)', () => {
      expect(d('2026-03-28').addDays(2).toString()).toBe('2026-03-30');
      expect(d('2026-10-24').addDays(2).toString()).toBe('2026-10-26');
      expect(d('2026-03-30').diffDays(d('2026-03-28'))).toBe(2);
    });

    it('diffDays returns signed number of days', () => {
      expect(d('2026-08-18').diffDays(d('2026-08-14'))).toBe(4);
      expect(d('2026-08-14').diffDays(d('2026-08-18'))).toBe(-4);
      expect(d('2027-08-01').diffDays(d('2026-08-01'))).toBe(365);
    });

    it('compares dates', () => {
      expect(d('2026-08-14').compare(d('2026-08-15'))).toBe(-1);
      expect(d('2026-08-14').compare(d('2026-08-14'))).toBe(0);
      expect(d('2026-08-15').compare(d('2026-08-14'))).toBe(1);
      expect(d('2026-08-14').equals(d('2026-08-14'))).toBe(true);
      expect(d('2026-08-14').isBefore(d('2026-08-15'))).toBe(true);
      expect(d('2026-08-15').isAfter(d('2026-08-14'))).toBe(true);
    });
  });

  describe('day of week', () => {
    it.each([
      ['2026-08-14', 5, false], // piątek
      ['2026-08-15', 6, true], // sobota
      ['2026-08-16', 0, true], // niedziela
      ['2026-08-17', 1, false], // poniedziałek
      ['1969-12-31', 3, false], // przed epoką (środa)
    ])('%s is day %i (weekend: %s)', (value, dayOfWeek, weekend) => {
      expect(d(value).dayOfWeek()).toBe(dayOfWeek);
      expect(d(value).isWeekend()).toBe(weekend);
    });
  });

  describe('fromInstant', () => {
    it('uses the calendar date of the given time zone (23:30 UTC 31.07 is 01.08 in Warsaw)', () => {
      const instant = new Date('2026-07-31T23:30:00Z');
      expect(CalendarDate.fromInstant(instant, 'Europe/Warsaw').toString()).toBe('2026-08-01');
      expect(CalendarDate.fromInstant(instant, 'UTC').toString()).toBe('2026-07-31');
    });

    it('handles winter time offset (+01:00)', () => {
      const instant = new Date('2026-12-31T23:30:00Z');
      expect(CalendarDate.fromInstant(instant, 'Europe/Warsaw').toString()).toBe('2027-01-01');
      expect(
        CalendarDate.fromInstant(new Date('2026-12-31T22:59:59Z'), 'Europe/Warsaw').toString(),
      ).toBe('2026-12-31');
    });
  });

  it('serializes to YYYY-MM-DD in JSON', () => {
    expect(JSON.stringify({ checkIn: d('2026-08-14') })).toBe('{"checkIn":"2026-08-14"}');
  });
});
