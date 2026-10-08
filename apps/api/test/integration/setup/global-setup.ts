import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export const POSTGRES_IMAGE = 'postgres:16-alpine';

export interface IntegrationGlobals {
  __POSTGRES_CONTAINER__?: StartedPostgreSqlContainer;
}

/**
 * Jedna baza PostgreSQL na przebieg testów integracyjnych (docs/architecture/testing-strategy.md).
 * `TEST_DATABASE_URL` (CI: service container) pomija Testcontainers; w przeciwnym razie startuje
 * kontener (wymaga działającego Dockera). Adres trafia do `DATABASE_URL` przed startem testów.
 * M3: tutaj `prisma migrate deploy`.
 */
export default async function globalSetup(): Promise<void> {
  const external = process.env.TEST_DATABASE_URL;
  if (external) {
    process.env.DATABASE_URL = external;
    return;
  }

  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('klucznik_test')
    .withUsername('klucznik')
    .withPassword('klucznik-test')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
  (globalThis as IntegrationGlobals).__POSTGRES_CONTAINER__ = container;
}
