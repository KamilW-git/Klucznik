import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../common/errors/not-found.error';
import { isValidStorageKey, type Storage } from '../../common/storage/storage';
import { type StorageConfig, storageConfig } from '../../config/storage.config';

/** Pliki w katalogu `STORAGE_LOCAL_PATH` (wolumen Dockera `uploads`). */
@Injectable()
export class LocalDiskStorage implements Storage {
  private ready?: Promise<unknown>;

  constructor(@Inject(storageConfig.KEY) private readonly config: StorageConfig) {}

  async put(key: string, content: Buffer): Promise<void> {
    await (this.ready ??= mkdir(this.config.localPath, { recursive: true }));
    await writeFile(this.pathOf(key), content, { flag: 'wx' });
  }

  async get(key: string): Promise<{ stream: Readable; size: number }> {
    const path = this.pathOf(key);
    try {
      const info = await stat(path);
      return { stream: createReadStream(path), size: info.size };
    } catch {
      throw new NotFoundError('File', key);
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  /** Klucz sprawdzany regexem przed dostępem do dysku, więc `../` nie wyjdzie poza katalog. */
  private pathOf(key: string): string {
    if (!isValidStorageKey(key)) {
      throw new NotFoundError('File', key);
    }
    return join(this.config.localPath, key);
  }
}
