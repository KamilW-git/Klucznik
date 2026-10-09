import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { BlockOverlapsReservationError } from '../domain/errors';
import {
  AVAILABILITY_REPOSITORY,
  type AvailabilityBlock,
  type AvailabilityRepository,
  BLOCKS_REPOSITORY,
  type BlockData,
  type BlocksRepository,
} from './ports';

/** Blokady terminów pokoju (docs/features/availability.md). Dostęp przez pokój (BR-12). */
@Injectable()
export class BlocksService {
  constructor(
    @Inject(BLOCKS_REPOSITORY) private readonly blocks: BlocksRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
  ) {}

  async list(
    roomId: string,
    scope: AccessScope,
    nights: { from?: CalendarDate; to?: CalendarDate },
  ): Promise<AvailabilityBlock[]> {
    await this.ownership.assertRoom(roomId, scope);
    return this.blocks.listByRoom(roomId, nights);
  }

  async create(roomId: string, scope: AccessScope, data: BlockData): Promise<AvailabilityBlock> {
    await this.ownership.assertRoom(roomId, scope);
    return this.tx.run(async () => {
      // BR-01, Q-15: blokada nie może objąć nocy aktywnej rezerwacji. Zamek pokoju wyklucza wyścig
      // z tworzeniem rezerwacji, które sprawdza blokady pod tym samym zamkiem. Blokady mogą się nakładać.
      await this.availability.lockRoom(roomId);
      const [reservation] = await this.availability.activeReservations([roomId], data.nights);
      if (reservation) {
        throw new BlockOverlapsReservationError(reservation);
      }
      return this.blocks.create(roomId, data);
    });
  }

  async delete(id: string, scope: AccessScope): Promise<void> {
    const block = await this.blocks.findById(id);
    if (!block) {
      throw new NotFoundError('AvailabilityBlock', id);
    }
    await this.ownership.assertRoom(block.roomId, scope); // cudzy lub usunięty pokój → 404
    await this.blocks.delete(id);
  }
}
