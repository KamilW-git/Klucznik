import { describe, expect, it } from 'vitest';

import { formatMoney, fromMinor, toMinor } from './money';

// Intl używa twardej spacji (U+00A0) jako separatora tysięcy i przed walutą.
const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('money', () => {
  it.each([
    [164_000, '1 640 zł'],
    [38_000, '380 zł'],
    [164_050, '1 640,50 zł'],
    [0, '0 zł'],
    [12_345_600, '123 456 zł'],
  ])('formatMoney(%i) → %s', (minor, expected) => {
    expect(normalize(formatMoney(minor))).toBe(expected);
  });

  it('converts złote ↔ grosze without float drift', () => {
    expect(toMinor(19.99)).toBe(1999);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(fromMinor(1999)).toBe(19.99);
  });
});
