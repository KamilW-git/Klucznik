import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export const POSTGRES_IMAGE = 'postgres:16-alpine';

export interface IntegrationGlobals {
  __POSTGRES_CONTAINER__?: StartedPostgreSqlContainer;
}

const API_ROOT = resolve(__dirname, '../../..');

/**
 * Jedna baza PostgreSQL na przebieg testów integracyjnych (docs/architecture/testing-strategy.md).
 * `TEST_DATABASE_URL` (CI: service container) pomija Testcontainers; w przeciwnym razie startuje
 * kontener (wymaga działającego Dockera). Następnie `prisma migrate deploy`, więc testy obejmują
 * też ręczny SQL z migracji (EXCLUDE, CHECK).
 */
export default async function globalSetup(): Promise<void> {
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
