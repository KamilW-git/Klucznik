import type { AccessScope } from '../../../common/access/access-scope';
import type { OwnershipPolicy } from '../../../common/access/ownership.policy';
import { FixedClock } from '../../../common/domain/clock';
import { HasFutureReservationsError } from '../../../common/domain/errors/has-future-reservations.error';
import type { TransactionManager } from '../../../common/transactions/transaction-manager';
import type { PhotosService } from '../../photos/application/photos.service';
import type { ReservationsQueryService } from '../../reservations/application/reservations-query.service';
import type { Room, RoomData, RoomsRepository } from './ports';
import { RoomsService } from './rooms.service';

const ROOM_ID = '3c9d1f2a-7b4e-4d6a-8e1f-2a5b7c9d0e13';
const OWNER: AccessScope = { userId: '6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a', role: 'OWNER' };
const NOW = '2026-08-01T10:00:00+02:00';

const room: Room = {
  id: ROOM_ID,
  propertyId: 'property-1',
  name: 'Domek Sosna',
  description: null,
  capacity: 4,
  basePricePerNight: 37000,
  minNights: 2,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

/** Fake repozytorium pokoi: zapisuje kolejność wywołań, żeby sprawdzić zamek przed BR-10. */
class InMemoryRooms {
  readonly calls: string[] = [];
  deletedAt: Date | null = null;

  findById(): Promise<Room | null> {
    return Promise.resolve(room);
  }
  lock(): Promise<void> {
    this.calls.push('lock');
    return Promise.resolve();
  }
  update(_id: string, changes: Partial<RoomData>): Promise<void> {
    this.calls.push(`update:${Object.keys(changes).join(',')}`);
    return Promise.resolve();
  }
  softDelete(_id: string, at: Date): Promise<void> {
    this.calls.push('softDelete');
    this.deletedAt = at;
    return Promise.resolve();
  }
}

function setup(futureReservations: number) {
  const rooms = new InMemoryRooms();
  const ownership: OwnershipPolicy = {
    assertProperty: () => Promise.reject(new Error('not used')),
    assertRoom: () =>
      Promise.resolve({
        room: { id: ROOM_ID, propertyId: 'property-1', isActive: true },
        property: { id: 'property-1', ownerId: OWNER.userId, currency: 'PLN', isActive: true },
      }),
  };
  const tx: TransactionManager = { run: (fn) => fn() };
  const reservations = {
    countedFor: [] as unknown[],
    countFutureActive(target: unknown): Promise<number> {
      this.countedFor.push(target);
      return Promise.resolve(futureReservations);
    },
    upcomingCountsByRoom: () => Promise.resolve(new Map<string, number>()),
  };
  const photos = { listForRooms: () => Promise.resolve(new Map()) };
  const service = new RoomsService(
    rooms as unknown as RoomsRepository,
    ownership,
    tx,
    FixedClock.at(NOW),
    photos as unknown as PhotosService,
    reservations as unknown as ReservationsQueryService,
  );
  return { service, rooms, reservations };
}

describe('RoomsService', () => {
  describe('delete', () => {
    it('BR-10: refuses to delete a room with future reservations (409 with count)', async () => {
      const { service, rooms } = setup(2);

      const error = await service.delete(ROOM_ID, OWNER).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HasFutureReservationsError);
      expect(error).toMatchObject({ code: 'HAS_FUTURE_RESERVATIONS', details: { count: 2 } });
      expect(rooms.calls).toEqual(['lock']);
    });

    it('BR-10: soft-deletes a room without future reservations after locking it', async () => {
      const { service, rooms, reservations } = setup(0);

      await service.delete(ROOM_ID, OWNER);

      expect(reservations.countedFor).toEqual([{ roomId: ROOM_ID }]);
      expect(rooms.calls).toEqual(['lock', 'softDelete']);
      expect(rooms.deletedAt).toEqual(FixedClock.at(NOW).now());
    });
  });

  describe('update', () => {
    it('BR-10: refuses to deactivate a room with future reservations', async () => {
      const { service, rooms } = setup(1);

      await expect(service.update(ROOM_ID, OWNER, { isActive: false })).rejects.toBeInstanceOf(
        HasFutureReservationsError,
      );
      expect(rooms.calls).toEqual(['lock']);
    });

    it('BR-10: other changes of a room with future reservations are allowed', async () => {
      const { service, rooms, reservations } = setup(3);

      await service.update(ROOM_ID, OWNER, { name: 'Domek Świerk', capacity: 5 });

      expect(reservations.countedFor).toEqual([]);
      expect(rooms.calls).toEqual(['update:name,capacity']);
    });
  });
});
