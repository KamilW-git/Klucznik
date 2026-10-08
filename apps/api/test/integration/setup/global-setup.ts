import { execSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export const POSTGRES_IMAGE = 'postgres:16-alpine';

export interface IntegrationGlobals {
  __POSTGRES_CONTAINER__?: StartedPostgreSqlContainer;
  __UPLOADS_DIR__?: string;
}

const API_ROOT = resolve(__dirname, '../../..');

/**
 * Jedna baza PostgreSQL na przebieg testów integracyjnych (docs/architecture/testing-strategy.md).
 * `TEST_DATABASE_URL` (CI: service container) pomija Testcontainers; w przeciwnym razie startuje
 * kontener (wymaga działającego Dockera). Następnie `prisma migrate deploy`, więc testy obejmują
 * też ręczny SQL z migracji (EXCLUDE, CHECK).
 */
export default async function globalSetup(): Promise<void> {
  // Pliki zdjęć w katalogu tymczasowym przebiegu (usuwany w global-teardown).
  const uploadsDir = await mkdtemp(join(tmpdir(), 'klucznik-uploads-'));
  process.env.STORAGE_LOCAL_PATH = uploadsDir;
  (globalThis as IntegrationGlobals).__UPLOADS_DIR__ = uploadsDir;

  let databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('klucznik_test')
      .withUsername('klucznik')
      .withPassword('klucznik-test')
      .start();
    (globalThis as IntegrationGlobals).__POSTGRES_CONTAINER__ = container;
    databaseUrl = container.getConnectionUri();
  }

  process.env.DATABASE_URL = databaseUrl;
  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
