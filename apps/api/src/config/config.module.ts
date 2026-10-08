import { ConfigModule } from '@nestjs/config';

import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { parseEnv } from './env.schema';

/**
 * Konfiguracja env: `.env` z `apps/api` albo z roota monorepo (`pnpm --filter` uruchamia w `apps/api`).
 * Zmienne ustawione w procesie (Docker, CI) mają pierwszeństwo przed plikiem.
 * W testach (`NODE_ENV=test`) plik jest pomijany, żeby lokalny `.env` nie wpływał na wynik.
 */
export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  envFilePath: ['.env', '../../.env'],
  ignoreEnvFile: process.env.NODE_ENV === 'test',
  validate: parseEnv,
  load: [appConfig, databaseConfig],
});
