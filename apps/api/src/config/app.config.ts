import { registerAs } from '@nestjs/config';

import { parseEnv } from './env.schema';

/** Typowana konfiguracja aplikacji. Wstrzykiwanie: `@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>`. */
export const appConfig = registerAs('app', () => {
  const env = parseEnv(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    publicUrl: env.APP_PUBLIC_URL,
    timeZone: env.APP_TIMEZONE,
    corsOrigins: env.CORS_ORIGINS,
    swaggerEnabled: env.SWAGGER_ENABLED,
    schedulerEnabled: env.SCHEDULER_ENABLED,
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
