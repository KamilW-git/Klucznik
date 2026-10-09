import { CalendarDate } from '../../../common/domain/calendar-date';
import { StayRange } from '../../../common/domain/stay-range';
import {
  type AvailabilityInput,
  type Conflict,
  findAvailabilityViolation,
  unavailableReasonOf,
} from './availability';

const d = (value: string): CalendarDate => CalendarDate.parse(value);
const active = { isActive: true, deletedAt: null };
const block: Conflict = {
  type: 'BLOCK',
  id: 'block-1',
  number: null,
  dateFrom: d('2026-08-10'),
  dateTo: d('2026-08-12'),
};

const input = (overrides: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  room: { ...active, capacity: 4 },
  property: active,
  stay: StayRange.of(d('2026-08-14'), d('2026-08-18')),
  guests: 2,
  minNights: 1,
  conflicts: [],
  ...overrides,
});

const reasonFor = (overrides: Partial<AvailabilityInput>) => {
  const violation = findAvailabilityViolation(input(overrides));
  return violation && unavailableReasonOf(violation);
};

describe('findAvailabilityViolation', () => {
  it('returns null when every rule is met', () => {
    expect(findAvailabilityViolation(input())).toBeNull();
  });

  it.each([
    [
      'BR-13: inactive room',
      'ROOM_NOT_BOOKABLE',
      { room: { isActive: false, deletedAt: null, capacity: 4 } },
    ],
    ['BR-02: more guests than capacity', 'CAPACITY_EXCEEDED', { guests: 5 }],
    ['BR-03: stay shorter than minNights', 'MIN_NIGHTS_NOT_MET', { minNights: 5 }],
    ['BR-01: a block or reservation covers a night', 'OCCUPIED', { conflicts: [block] }],
  ] as const)('%s → %s', (_, reason, overrides) => {
    expect(reasonFor(overrides)).toBe(reason);
  });

  it('BR-13, BR-02, BR-03, BR-01: reports the first violated rule in the documented order', () => {
    expect(
      reasonFor({
        property: { isActive: false, deletedAt: null },
        guests: 9,
        minNights: 9,
        conflicts: [block],
      }),
    ).toBe('ROOM_NOT_BOOKABLE');
    expect(reasonFor({ guests: 9, minNights: 9, conflicts: [block] })).toBe('CAPACITY_EXCEEDED');
    expect(reasonFor({ minNights: 9, conflicts: [block] })).toBe('MIN_NIGHTS_NOT_MET');
  });

  it('BR-03: manual reservation may ignore minNights (Q-01)', () => {
    expect(reasonFor({ minNights: 9, ignoreMinNights: true })).toBeNull();
  });

  it('BR-01: the overlap error carries the conflicts for the UI', () => {
    expect(findAvailabilityViolation(input({ conflicts: [block] }))).toMatchObject({
      code: 'RESERVATION_OVERLAP',
      details: { conflicts: [block] },
    });
  });
});
