import { describe, expect, it } from 'vitest';

import { occupiedNightPredicate } from './date-matchers';

describe('occupiedNightPredicate (BR-01 in the date picker)', () => {
  const taken = occupiedNightPredicate([
    { from: '2026-08-14', to: '2026-08-18', exclusiveEnd: true }, // pobyt: noce 14–17
    { from: '2026-08-20', to: '2026-08-22', exclusiveEnd: false }, // blokada: noce 20–22
  ]);

  it.each([
    ['2026-08-13', false],
    ['2026-08-14', true],
    ['2026-08-17', true],
    ['2026-08-18', false], // dzień wyjazdu jest wolny dla kolejnego przyjazdu
    ['2026-08-22', true],
    ['2026-08-23', false],
  ])('%s taken: %s', (day, expected) => {
    const [year, month, date] = day.split('-').map(Number) as [number, number, number];
    expect(taken(new Date(year, month - 1, date))).toBe(expected);
  });
});
