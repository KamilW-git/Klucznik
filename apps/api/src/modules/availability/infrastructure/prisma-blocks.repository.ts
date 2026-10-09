import { Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { fromDbDate, toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { AvailabilityBlock, BlockData, BlocksRepository } from '../application/ports';

export const BLOCK_SELECT = {
  id: true,
  roomId: true,
  dateFrom: true,
  dateTo: true,
  reason: true,
  createdAt: true,
} as const satisfies Prisma.AvailabilityBlockSelect;

type BlockRow = Prisma.AvailabilityBlockGetPayload<{ select: typeof BLOCK_SELECT }>;

export function toBlock({ dateFrom, dateTo, ...row }: BlockRow): AvailabilityBlock {
  return { ...row, nights: InclusiveDateRange.of(fromDbDate(dateFrom), fromDbDate(dateTo)) };
}

@Injectable()
export class PrismaBlocksRepository extends PrismaRepository implements BlocksRepository {
  async listByRoom(
    roomId: string,
    nights: { from?: CalendarDate; to?: CalendarDate } = {},
  ): Promise<AvailabilityBlock[]> {
    // Zakres włączny przecina [from, to], gdy dateFrom ≤ to i dateTo ≥ from.
    const rows = await this.db.availabilityBlock.findMany({
      where: {
        roomId,
        ...(nights.to && { dateFrom: { lte: toDbDate(nights.to) } }),
        ...(nights.from && { dateTo: { gte: toDbDate(nights.from) } }),
      },
      orderBy: [{ dateFrom: 'asc' }, { id: 'asc' }],
      select: BLOCK_SELECT,
    });
    return rows.map(toBlock);
  }

  async listForRooms(
    roomIds: readonly string[],
    nights: { from: CalendarDate; to: CalendarDate },
  ): Promise<AvailabilityBlock[]> {
    const rows = await this.db.availabilityBlock.findMany({
      where: {
        roomId: { in: [...roomIds] },
        dateFrom: { lte: toDbDate(nights.to) },
        dateTo: { gte: toDbDate(nights.from) },
      },
      orderBy: [{ dateFrom: 'asc' }, { id: 'asc' }],
      select: BLOCK_SELECT,
    });
    return rows.map(toBlock);
  }

  async findById(id: string): Promise<AvailabilityBlock | null> {
    const row = await this.db.availabilityBlock.findUnique({ where: { id }, select: BLOCK_SELECT });
    return row && toBlock(row);
  }

  async create(roomId: string, data: BlockData): Promise<AvailabilityBlock> {
    const row = await this.db.availabilityBlock.create({
      data: {
        roomId,
        dateFrom: toDbDate(data.nights.from),
        dateTo: toDbDate(data.nights.to),
        reason: data.reason,
      },
      select: BLOCK_SELECT,
    });
    return toBlock(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.availabilityBlock.delete({ where: { id } });
  }
}
