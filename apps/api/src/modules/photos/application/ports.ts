import type { AccessScope } from '../../../common/access/access-scope';
import type { ImageMimeType } from '../domain/image-type';

export interface Photo {
  id: string;
  propertyId: string;
  /** `null` = zdjęcie obiektu. */
  roomId: string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  altText: string | null;
  createdAt: Date;
}

/** Galeria: zdjęcia obiektu (`roomId: null`) albo jednego pokoju. */
export interface Gallery {
  propertyId: string;
  roomId: string | null;
}

export interface NewPhoto extends Gallery {
  storageKey: string;
  mimeType: ImageMimeType;
  sizeBytes: number;
  sortOrder: number;
  altText: string | null;
}

export interface PhotosRepository {
  count(gallery: Gallery): Promise<number>;
  /** Najwyższy `sortOrder` w galerii albo `-1` dla pustej. */
  maxSortOrder(gallery: Gallery): Promise<number>;
  create(photo: NewPhoto): Promise<Photo>;
  /** Zdjęcie w zakresie (BR-12), z pominięciem usuniętych obiektów i pokoi. */
  findAccessible(id: string, scope: AccessScope): Promise<Photo | null>;
  /** Id zdjęć galerii w kolejności `sortOrder`. */
  galleryOrder(gallery: Gallery): Promise<string[]>;
  /** `sortOrder` = indeks na liście. */
  applyOrder(orderedIds: string[]): Promise<void>;
  updateAltText(id: string, altText: string | null): Promise<void>;
  delete(id: string): Promise<void>;
  listForProperty(propertyId: string): Promise<Photo[]>;
  listForRooms(roomIds: string[]): Promise<Map<string, Photo[]>>;
}

export const PHOTOS_REPOSITORY = Symbol('PHOTOS_REPOSITORY');
