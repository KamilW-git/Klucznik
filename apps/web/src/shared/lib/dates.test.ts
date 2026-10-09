import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatDateTime,
  formatLongDate,
  formatNights,
  formatStayRange,
  nightsBetween,
  parseApiDate,
  toApiDate,
} from './dates';

describe('dates', () => {
  it('formats API dates as dd.MM.yyyy without a time zone shift', () => {
    expect(formatDate('2026-08-14')).toBe('14.08.2026');
    expect(toApiDate(parseApiDate('2026-01-01'))).toBe('2026-01-01');
  });

  it('formats date-time and long dates in Polish', () => {
    expect(formatDateTime(new Date(2026, 7, 3, 10, 5))).toBe('03.08.2026, 10:05');
    expect(formatLongDate('2025-06-16')).toBe('poniedziałek, 16 czerwca 2025');
  });

  it('counts nights in [checkIn, checkOut) across the DST change', () => {
    expect(nightsBetween('2026-08-14', '2026-08-18')).toBe(4);
    expect(nightsBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it.each([
    [1, '1 noc'],
    [2, '2 noce'],
    [4, '4 noce'],
    [5, '5 nocy'],
    [12, '12 nocy'],
    [22, '22 noce'],
    [25, '25 nocy'],
  ])('formatNights(%i) → %s', (count, expected) => {
    expect(formatNights(count)).toBe(expected);
  });

  it('formats a stay range with the year once (and twice across years)', () => {
    expect(formatStayRange('2026-08-14', '2026-08-18')).toBe('14.08 – 18.08.2026 (4 noce)');
    expect(formatStayRange('2026-12-30', '2027-01-02')).toBe('30.12.2026 – 02.01.2027 (3 noce)');
  });
});
