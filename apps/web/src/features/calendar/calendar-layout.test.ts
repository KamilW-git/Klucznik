import { describe, expect, it } from 'vitest';

import { barColumns, blockCheckout, calendarWindow, shiftAnchor } from './calendar-layout';

const august = calendarWindow(new Date(2026, 7, 14), 'month');

describe('calendar layout (O3)', () => {
  it('month window = calendar month; 2 weeks start on Monday', () => {
    expect([august.from, august.to, august.days.length]).toEqual(['2026-08-01', '2026-08-31', 31]);
    const twoWeeks = calendarWindow(new Date(2026, 7, 14), '2w'); // piątek
    expect([twoWeeks.from, twoWeeks.to, twoWeeks.days.length]).toEqual([
      '2026-08-10',
      '2026-08-23',
      14,
    ]);
  });

  it('shifts by a month or by 2 weeks', () => {
    expect(shiftAnchor(new Date(2026, 0, 31), 'month', 1).getMonth()).toBe(1);
    expect(shiftAnchor(new Date(2026, 7, 10), '2w', -1).getDate()).toBe(27);
  });

  it('a stay starts in the afternoon of check-in and ends in the morning of check-out', () => {
    // 14.08 = dzień 13 (kolumny 27–28), 18.08 = dzień 17 (kolumny 35–36).
    expect(barColumns('2026-08-14', '2026-08-18', august)).toEqual({
      start: 28,
      end: 36,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it('back-to-back stays share the changeover day (half each)', () => {
    const first = barColumns('2026-08-10', '2026-08-14', august);
    const second = barColumns('2026-08-14', '2026-08-18', august);
    expect(first?.end).toBe(second?.start);
  });

  it('clips stays crossing the window edges', () => {
    expect(barColumns('2026-07-28', '2026-08-03', august)).toMatchObject({
      start: 1,
      clippedStart: true,
      clippedEnd: false,
    });
    expect(barColumns('2026-08-30', '2026-09-04', august)).toMatchObject({
      end: 63,
      clippedEnd: true,
    });
    // Wyjazd 1.08: widoczna tylko poranna połowa pierwszego dnia.
    expect(barColumns('2026-07-25', '2026-08-01', august)).toMatchObject({ start: 1, end: 2 });
    expect(barColumns('2026-07-01', '2026-07-31', august)).toBeNull();
    expect(barColumns('2026-09-01', '2026-09-03', august)).toBeNull();
  });

  it('a block (nights inclusive) is drawn up to the day after its last night', () => {
    expect(blockCheckout('2026-08-22')).toBe('2026-08-23');
  });
});
