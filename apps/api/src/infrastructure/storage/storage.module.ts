import { Global, Module } from '@nestjs/common';

import { STORAGE } from '../../common/storage/storage';
import { LocalDiskStorage } from './local-disk.storage';

/** Globalny port `STORAGE`. MVP: dysk lokalny; później `S3Storage` wybierany przez `STORAGE_DRIVER`. */
@Global()
@Module({
  providers: [{ provide: STORAGE, useClass: LocalDiskStorage }],
  exports: [STORAGE],
})
export class StorageModule {}
