import { Injectable } from '@nestjs/common';

import { type AccessScope, ownerIdFilter } from '../../../common/access/access-scope';
import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { Gallery, NewPhoto, Photo, PhotosRepository } from '../application/ports';

const PHOTO_SELECT = {
  id: true,
  propertyId: true,
  roomId: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
  sortOrder: true,
  altText: true,
  createdAt: true,
} as const satisfies Prisma.PhotoSelect;

const ORDER: Prisma.PhotoOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { createdAt: 'asc' }];

const galleryWhere = ({ propertyId, roomId }: Gallery): Prisma.PhotoWhereInput => ({
  propertyId,
  roomId,
});

@Injectable()
export class PrismaPhotosRepository extends PrismaRepository implements PhotosRepository {
  count(gallery: Gallery): Promise<number> {
    return this.db.photo.count({ where: galleryWhere(gallery) });
  }

  async maxSortOrder(gallery: Gallery): Promise<number> {
    const { _max } = await this.db.photo.aggregate({
      where: galleryWhere(gallery),
      _max: { sortOrder: true },
    });
    return _max.sortOrder ?? -1;
  }

  create(photo: NewPhoto): Promise<Photo> {
    return this.db.photo.create({ data: photo, select: PHOTO_SELECT });
  }

  findAccessible(id: string, scope: AccessScope): Promise<Photo | null> {
    return this.db.photo.findFirst({
      where: {
        id,
        property: { deletedAt: null, ownerId: ownerIdFilter(scope) },
        // Zdjęcie usuniętego pokoju jest niedostępne; zdjęcie obiektu nie ma pokoju.
        OR: [{ roomId: null }, { room: { deletedAt: null } }],
      },
      select: PHOTO_SELECT,
    });
  }

  async galleryOrder(gallery: Gallery): Promise<string[]> {
    const rows = await this.db.photo.findMany({
      where: galleryWhere(gallery),
      orderBy: ORDER,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async applyOrder(orderedIds: string[]): Promise<void> {
    for (const [sortOrder, id] of orderedIds.entries()) {
      await this.db.photo.update({ where: { id }, data: { sortOrder } });
    }
  }

  async updateAltText(id: string, altText: string | null): Promise<void> {
    await this.db.photo.update({ where: { id }, data: { altText } });
  }

  async delete(id: string): Promise<void> {
    await this.db.photo.delete({ where: { id } });
  }

  listForProperty(propertyId: string): Promise<Photo[]> {
    return this.db.photo.findMany({
      where: { propertyId, roomId: null },
      orderBy: ORDER,
      select: PHOTO_SELECT,
    });
  }

  async listForRooms(roomIds: string[]): Promise<Map<string, Photo[]>> {
    const byRoom = new Map<string, Photo[]>(roomIds.map((id) => [id, []]));
    if (roomIds.length === 0) {
      return byRoom;
    }
    const photos = await this.db.photo.findMany({
      where: { roomId: { in: roomIds } },
      orderBy: ORDER,
      select: PHOTO_SELECT,
    });
    for (const photo of photos) {
      byRoom.get(photo.roomId!)?.push(photo);
    }
    return byRoom;
  }
}
