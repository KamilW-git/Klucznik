import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { type StorageConfig, storageConfig } from '../../config/storage.config';
import { PhotosService } from './application/photos.service';
import { PHOTOS_REPOSITORY } from './application/ports';
import { FilesController } from './http/files.controller';
import { PhotosController } from './http/photos.controller';
import { PrismaPhotosRepository } from './infrastructure/prisma-photos.repository';

/** Zdjęcia i pliki (docs/features/photos.md). Eksport: `PhotosService` (galerie dla obiektów i pokoi). */
@Module({
  imports: [
    // Bez `storage`/`dest` multer trzyma plik w pamięci (sygnatura sprawdzana przed zapisem na dysk).
    // Przekroczenie limitu → 413 FILE_TOO_LARGE.
    MulterModule.registerAsync({
      inject: [storageConfig.KEY],
      useFactory: (config: StorageConfig) => ({
        limits: { fileSize: config.uploadMaxBytes, files: 1 },
      }),
    }),
  ],
  controllers: [PhotosController, FilesController],
  providers: [PhotosService, { provide: PHOTOS_REPOSITORY, useClass: PrismaPhotosRepository }],
  exports: [PhotosService],
})
export class PhotosModule {}
