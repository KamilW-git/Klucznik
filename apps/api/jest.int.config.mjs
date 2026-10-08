// Testy integracyjne: test/integration/*.e2e-spec.ts, prawdziwy AppModule i PostgreSQL
// (Testcontainers albo TEST_DATABASE_URL). Uruchamiane z --runInBand (jedna baza na przebieg).

/** @type {import('jest').Config} */
export default {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/test/integration/setup/test-env.ts'],
  // Start kontenera PostgreSQL przy pierwszym uruchomieniu może trwać dłużej (pobieranie obrazu).
  testTimeout: 30_000,
};
