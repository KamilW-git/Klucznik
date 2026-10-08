import { isAbsolute, resolve } from 'node:path';

import { registerAs } from '@nestjs/config';

import { parseEnv } from './env.schema';

/** Pliki przesyłane przez użytkowników (docs/features/photos.md). */
export const storageConfig = registerAs('storage', () => {
  const env = parseEnv(process.env);
  return {
    driver: env.STORAGE_DRIVER,
    // Ścieżka względna liczona od katalogu uruchomienia (`apps/api` przy `pnpm dev`).
    localPath: isAbsolute(env.STORAGE_LOCAL_PATH)
      ? env.STORAGE_LOCAL_PATH
      : resolve(process.cwd(), env.STORAGE_LOCAL_PATH),
    uploadMaxBytes: env.UPLOAD_MAX_BYTES,
  };
});

export type StorageConfig = ReturnType<typeof storageConfig>;
