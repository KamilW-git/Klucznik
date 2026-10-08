import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { Room, RoomData, RoomsRepository } from '../application/ports';

const ROOM_SELECT = {
  id: true,
  propertyId: true,
  name: true,
  description: true,
  capacity: true,
  basePricePerNight: true,
  minNights: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.RoomSelect;

@Injectable()
export class PrismaRoomsRepository extends PrismaRepository implements RoomsRepository {
  listByProperty(propertyId: string, includeInactive: boolean): Promise<Room[]> {
    return this.db.room.findMany({
      where: { propertyId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: ROOM_SELECT,
    });
  }

  findById(id: string): Promise<Room | null> {
    return this.db.room.findFirst({ where: { id, deletedAt: null }, select: ROOM_SELECT });
  }

  create(propertyId: string, data: RoomData): Promise<Room> {
    return this.db.room.create({ data: { ...data, propertyId }, select: ROOM_SELECT });
  }

  async update(id: string, changes: Partial<RoomData>): Promise<void> {
    await this.db.room.update({ where: { id }, data: changes });
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.room.update({ where: { id }, data: { deletedAt: at } });
  }

  async lock(id: string): Promise<void> {
    await this.db.$queryRaw`SELECT id FROM rooms WHERE id = ${id}::uuid FOR UPDATE`;
  }
}
