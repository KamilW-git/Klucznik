import { CapacityExceededError, RoomNotBookableError } from './errors';

interface Bookable {
  isActive: boolean;
  deletedAt: Date | null;
}

// BR-02: liczba gości nie przekracza pojemności pokoju.
export function assertCapacity(room: { capacity: number }, guestsCount: number): void {
  if (guestsCount > room.capacity) {
    throw new CapacityExceededError(room.capacity, guestsCount);
  }
}

// BR-13: rezerwować można tylko aktywny, nieusunięty pokój w aktywnym, nieusuniętym obiekcie.
export function assertBookable(room: Bookable, property: Bookable): void {
  const isBookable = (item: Bookable): boolean => item.isActive && item.deletedAt === null;
  if (!isBookable(room) || !isBookable(property)) {
    throw new RoomNotBookableError();
  }
}
