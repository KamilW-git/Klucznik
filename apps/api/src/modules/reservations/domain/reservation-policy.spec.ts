import { CapacityExceededError, RoomNotBookableError } from './errors';
import { assertBookable, assertCapacity } from './reservation-policy';

describe('assertCapacity', () => {
  it('BR-02: accepts guests up to the capacity', () => {
    expect(() => assertCapacity({ capacity: 4 }, 4)).not.toThrow();
  });

  it('BR-02: capacity 4, 5 guests → CAPACITY_EXCEEDED', () => {
    expect(() => assertCapacity({ capacity: 4 }, 5)).toThrow(CapacityExceededError);
  });
});

describe('assertBookable', () => {
  const active = { isActive: true, deletedAt: null };
  const deleted = { isActive: true, deletedAt: new Date('2026-07-01T00:00:00Z') };
  const hidden = { isActive: false, deletedAt: null };

  it('BR-13: active room in an active property is bookable', () => {
    expect(() => assertBookable(active, active)).not.toThrow();
  });

  it.each([
    ['inactive room', hidden, active],
    ['deleted room', deleted, active],
    ['inactive property', active, hidden],
    ['deleted property', active, deleted],
  ])('BR-13: %s → ROOM_NOT_BOOKABLE', (_, room, property) => {
    expect(() => assertBookable(room, property)).toThrow(RoomNotBookableError);
  });
});
