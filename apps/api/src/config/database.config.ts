import { registerAs } from '@nestjs/config';

import { parseEnv } from './env.schema';

/** Połączenie z PostgreSQL. Wstrzykiwanie: `@Inject(databaseConfig.KEY) config: DatabaseConfig`. */
export const databaseConfig = registerAs('database', () => {
  const env = parseEnv(process.env);
  return { url: env.DATABASE_URL };
});

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
