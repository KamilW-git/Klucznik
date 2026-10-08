import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { assertNoFutureReservations } from '../../../common/domain/errors/has-future-reservations.error';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { PhotosService } from '../../photos/application/photos.service';
import type { Photo } from '../../photos/application/ports';
import { ReservationsQueryService } from '../../reservations/application/reservations-query.service';
import { type Room, type RoomData, ROOMS_REPOSITORY, type RoomsRepository } from './ports';

export interface RoomView extends Room {
  currency: string;
  photos: Photo[];
  /** `PENDING`/`CONFIRMED` z `checkOut > dziś`. */
  upcomingReservationsCount: number;
}

/** Pokoje i domki (docs/features/rooms.md). Dostęp przez obiekt właściciela (BR-12). */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly photos: PhotosService,
    private readonly reservations: ReservationsQueryService,
  ) {}

  async list(
    propertyId: string,
    scope: AccessScope,
    includeInactive: boolean,
  ): Promise<RoomView[]> {
    const property = await this.ownership.assertProperty(propertyId, scope);
    const rooms = await this.rooms.listByProperty(property.id, includeInactive);
    return this.toViews(rooms, property.currency);
  }

  async create(propertyId: string, scope: AccessScope, data: RoomData): Promise<RoomView> {
    const property = await this.ownership.assertProperty(propertyId, scope);
    const room = await this.rooms.create(property.id, data);
    return (await this.toViews([room], property.currency))[0]!;
  }

  async get(id: string, scope: AccessScope): Promise<RoomView> {
    const { property } = await this.ownership.assertRoom(id, scope);
    return (await this.toViews([await this.findOrFail(id)], property.currency))[0]!;
  }

  async update(id: string, scope: AccessScope, changes: Partial<RoomData>): Promise<RoomView> {
    const { room, property } = await this.ownership.assertRoom(id, scope);
    await this.tx.run(async () => {
      // BR-10: ukrycie pokoju z przyszłymi rezerwacjami jest zablokowane.
      if (changes.isActive === false && room.isActive) {
        await this.rooms.lock(id);
        assertNoFutureReservations(await this.reservations.countFutureActive({ roomId: id }));
      }
      await this.rooms.update(id, changes);
    });
    return (await this.toViews([await this.findOrFail(id)], property.currency))[0]!;
  }

  /** Soft delete: historia rezerwacji zostaje (BR-10). */
  async delete(id: string, scope: AccessScope): Promise<void> {
    await this.ownership.assertRoom(id, scope);
    await this.tx.run(async () => {
      await this.rooms.lock(id);
      assertNoFutureReservations(await this.reservations.countFutureActive({ roomId: id })); // BR-10
      await this.rooms.softDelete(id, this.clock.now());
    });
  }

  private async findOrFail(id: string): Promise<Room> {
    const room = await this.rooms.findById(id);
    if (!room) {
      throw new NotFoundError('Room', id);
    }
    return room;
  }

  private async toViews(rooms: Room[], currency: string): Promise<RoomView[]> {
    const ids = rooms.map((room) => room.id);
    const [photos, upcoming] = await Promise.all([
      this.photos.listForRooms(ids),
      this.reservations.upcomingCountsByRoom(ids),
    ]);
    return rooms.map((room) => ({
      ...room,
      currency,
      photos: photos.get(room.id) ?? [],
      upcomingReservationsCount: upcoming.get(room.id) ?? 0,
    }));
  }
}
