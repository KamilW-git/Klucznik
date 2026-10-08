import { FixedClock } from './clock';

describe('FixedClock', () => {
  it('returns the fixed instant and today in Europe/Warsaw', () => {
    const clock = FixedClock.at('2026-08-01T10:00:00+02:00');
    expect(clock.now().toISOString()).toBe('2026-08-01T08:00:00.000Z');
    expect(clock.today().toString()).toBe('2026-08-01');
  });

  it('computes today across the day boundary (23:30 UTC 31.07 → 01.08 in Warsaw)', () => {
    expect(FixedClock.at('2026-07-31T23:30:00Z').today().toString()).toBe('2026-08-01');
    expect(FixedClock.at('2026-07-31T21:59:59Z').today().toString()).toBe('2026-07-31');
  });

  it('respects a custom time zone', () => {
    expect(FixedClock.at('2026-07-31T23:30:00Z', 'UTC').today().toString()).toBe('2026-07-31');
  });

  it('does not let callers mutate its state through now()', () => {
    const clock = FixedClock.at('2026-08-01T10:00:00Z');
    clock.now().setUTCFullYear(2000);
    expect(clock.now().toISOString()).toBe('2026-08-01T10:00:00.000Z');
  });

  it('can be advanced and reset', () => {
    const clock = FixedClock.at('2026-08-01T21:30:00Z');
    clock.advanceBy(60 * 60 * 1000);
    expect(clock.now().toISOString()).toBe('2026-08-01T22:30:00.000Z');
    expect(clock.today().toString()).toBe('2026-08-02');
    clock.setTo('2026-12-24T12:00:00Z');
    expect(clock.today().toString()).toBe('2026-12-24');
  });

  it('rejects an invalid timestamp', () => {
    expect(() => FixedClock.at('not-a-date')).toThrow(RangeError);
  });
});
