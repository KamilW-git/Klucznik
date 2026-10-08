import { CalendarDate } from '../../common/domain/calendar-date';
import { fromDbDate, toDbDate } from './prisma-dates';

describe('prisma dates', () => {
  it('maps a calendar date to midnight UTC', () => {
    expect(toDbDate(CalendarDate.parse('2026-08-14')).toISOString()).toBe(
      '2026-08-14T00:00:00.000Z',
    );
  });

  it('round-trips across DST and year boundaries', () => {
    for (const value of ['2026-03-29', '2026-10-25', '2026-12-31', '2028-02-29']) {
      expect(fromDbDate(toDbDate(CalendarDate.parse(value))).toString()).toBe(value);
    }
  });
});
