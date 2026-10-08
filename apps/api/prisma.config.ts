import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma 7 nie wczytuje `.env` sama. Kolejność jak w AppConfigModule: apps/api/.env, potem root.
// Zmienne już ustawione w procesie (Docker, CI, testy) mają pierwszeństwo.
for (const path of ['.env', '../../.env']) {
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

/** Konfiguracja Prisma CLI (apps/api/docs/persistence-layer.md). */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // `prisma generate` nie potrzebuje bazy, więc brak DATABASE_URL (np. CI `quality`) nie jest błędem.
  datasource: { url: process.env.DATABASE_URL },
});
