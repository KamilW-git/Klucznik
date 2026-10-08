import { Injectable } from '@nestjs/common';

import { type AccessScope, ownerIdFilter } from '../../common/access/access-scope';
import type {
  OwnedProperty,
  OwnedRoom,
  OwnershipPolicy,
} from '../../common/access/ownership.policy';
import { NotFoundError } from '../../common/errors/not-found.error';
import { PrismaRepository } from '../prisma/prisma.repository';

const PROPERTY_SELECT = { id: true, ownerId: true, currency: true, isActive: true } as const;

/** Filtr własności w zapytaniu, nie po pobraniu rekordu (ADR 0008). */
@Injectable()
export class PrismaOwnershipPolicy extends PrismaRepository implements OwnershipPolicy {
  async assertProperty(propertyId: string, scope: AccessScope): Promise<OwnedProperty> {
    const property = await this.db.property.findFirst({
      where: { id: propertyId, deletedAt: null, ownerId: ownerIdFilter(scope) },
      select: PROPERTY_SELECT,
    });
    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }
    return property;
  }

  async assertRoom(
    roomId: string,
    scope: AccessScope,
  ): Promise<{ room: OwnedRoom; property: OwnedProperty }> {
    const room = await this.db.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        property: { deletedAt: null, ownerId: ownerIdFilter(scope) },
      },
      select: { id: true, propertyId: true, isActive: true, property: { select: PROPERTY_SELECT } },
    });
    if (!room) {
      throw new NotFoundError('Room', roomId);
    }
    const { property, ...ownedRoom } = room;
    return { room: ownedRoom, property };
  }
}
