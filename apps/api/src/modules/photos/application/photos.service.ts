import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import { NotFoundError } from '../../../common/errors/not-found.error';
import { STORAGE, type Storage } from '../../../common/storage/storage';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { PhotoLimitReachedError } from '../domain/errors';
import { detectImageType, IMAGE_EXTENSIONS } from '../domain/image-type';
import { moveToPosition, PHOTO_LIMIT } from '../domain/photo-order';
import { UnsupportedFileTypeError } from './errors';
import { type Gallery, type Photo, PHOTOS_REPOSITORY, type PhotosRepository } from './ports';

export type UploadTarget = { propertyId: string } | { roomId: string };

export interface UploadedFile {
  buffer: Buffer;
}

/**
 * Zdjęcia obiektów i pokoi (docs/features/photos.md). Plik zapisujemy przed transakcją i usuwamy,
 * gdy zapis do bazy się nie uda; przy usuwaniu najpierw rekord, plik po commicie.
 */
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @Inject(PHOTOS_REPOSITORY) private readonly photos: PhotosRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
  ) {}

  async upload(
    target: UploadTarget,
    scope: AccessScope,
    file: UploadedFile,
    altText: string | null,
  ): Promise<Photo> {
    const gallery = await this.galleryOf(target, scope); // BR-12 → 404
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) {
      throw new UnsupportedFileTypeError();
    }
    if ((await this.photos.count(gallery)) >= PHOTO_LIMIT) {
      throw new PhotoLimitReachedError();
    }

    const storageKey = `${randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`;
    await this.storage.put(storageKey, file.buffer, mimeType);
    try {
      return await this.tx.run(async () =>
        this.photos.create({
          ...gallery,
          storageKey,
          mimeType,
          sizeBytes: file.buffer.length,
          // Nowe zdjęcie na koniec galerii.
          sortOrder: (await this.photos.maxSortOrder(gallery)) + 1,
          altText,
        }),
      );
    } catch (error) {
      // Kompensacja: bez rekordu w bazie plik byłby osierocony.
      await this.removeFile(storageKey);
      throw error;
    }
  }

  async update(
    id: string,
    scope: AccessScope,
    changes: { altText?: string | null; sortOrder?: number },
  ): Promise<Photo> {
    return this.tx.run(async () => {
      const photo = await this.findOrFail(id, scope);
      if (changes.altText !== undefined) {
        await this.photos.updateAltText(id, changes.altText);
      }
      if (changes.sortOrder !== undefined) {
        const order = await this.photos.galleryOrder(photo);
        await this.photos.applyOrder(moveToPosition(order, id, changes.sortOrder));
      }
      return this.findOrFail(id, scope);
    });
  }

  async delete(id: string, scope: AccessScope): Promise<void> {
    const removed = await this.tx.run(async () => {
      const photo = await this.findOrFail(id, scope);
      await this.photos.delete(id);
      // Bez luk w numeracji: pozycja 0 zawsze jest zdjęciem głównym.
      await this.photos.applyOrder(await this.photos.galleryOrder(photo));
      return photo;
    });
    await this.removeFile(removed.storageKey);
  }

  /** Dla `properties` i `rooms`: wywołujący sprawdził już dostęp do obiektu lub pokoju. */
  listForProperty(propertyId: string): Promise<Photo[]> {
    return this.photos.listForProperty(propertyId);
  }

  listForRooms(roomIds: string[]): Promise<Map<string, Photo[]>> {
    return this.photos.listForRooms(roomIds);
  }

  private async galleryOf(target: UploadTarget, scope: AccessScope): Promise<Gallery> {
    if ('roomId' in target) {
      const { room } = await this.ownership.assertRoom(target.roomId, scope);
      return { propertyId: room.propertyId, roomId: room.id };
    }
    const property = await this.ownership.assertProperty(target.propertyId, scope);
    return { propertyId: property.id, roomId: null };
  }

  private async findOrFail(id: string, scope: AccessScope): Promise<Photo> {
    const photo = await this.photos.findAccessible(id, scope);
    if (!photo) {
      throw new NotFoundError('Photo', id);
    }
    return photo;
  }

  private async removeFile(storageKey: string): Promise<void> {
    try {
      await this.storage.delete(storageKey);
    } catch (error) {
      // Błąd usunięcia pliku nie cofa operacji; zostaje osierocony plik do ręcznego sprzątnięcia.
      this.logger.error(
        `Could not delete file ${storageKey}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
