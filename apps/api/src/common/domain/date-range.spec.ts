import { CalendarDate } from './calendar-date';
import { InclusiveDateRange, inclusiveRangesOverlap } from './date-range';

const range = (from: string, to: string): InclusiveDateRange =>
  InclusiveDateRange.of(CalendarDate.parse(from), CalendarDate.parse(to));

describe('InclusiveDateRange', () => {
  it('counts nights inclusively (10.08–12.08 = 3 nights)', () => {
    expect(range('2026-08-10', '2026-08-12').nights()).toBe(3);
    expect(range('2026-08-10', '2026-08-10').nights()).toBe(1);
  });

  it('rejects end before start', () => {
    expect(() => range('2026-08-12', '2026-08-10')).toThrow(RangeError);
  });

  it('contains both boundary nights', () => {
    const season = range('2026-07-01', '2026-08-31');
    expect(season.contains(CalendarDate.parse('2026-07-01'))).toBe(true);
    expect(season.contains(CalendarDate.parse('2026-08-31'))).toBe(true);
    expect(season.contains(CalendarDate.parse('2026-06-30'))).toBe(false);
    expect(season.contains(CalendarDate.parse('2026-09-01'))).toBe(false);
  });
});

describe('inclusiveRangesOverlap', () => {
  it.each([
    // [a.from, a.to, b.from, b.to, overlaps]
    ['2026-07-01', '2026-08-31', '2026-08-01', '2026-08-15', true], // BR-09: „Sierpień” w „Wysokim sezonie”
    ['2026-07-01', '2026-07-31', '2026-07-31', '2026-08-15', true], // wspólna ostatnia noc
    ['2026-07-01', '2026-07-31', '2026-08-01', '2026-08-31', false], // kolejne dni bez wspólnej nocy
    ['2026-08-10', '2026-08-12', '2026-08-01', '2026-08-31', true], // zawieranie
    ['2026-08-10', '2026-08-10', '2026-08-10', '2026-08-10', true], // jedna wspólna noc
  ])('BR-09: [%s, %s] vs [%s, %s] → %s', (aFrom, aTo, bFrom, bTo, expected) => {
    const a = range(aFrom, aTo);
    const b = range(bFrom, bTo);
    expect(inclusiveRangesOverlap(a, b)).toBe(expected);
    expect(inclusiveRangesOverlap(b, a)).toBe(expected);
  });
});
