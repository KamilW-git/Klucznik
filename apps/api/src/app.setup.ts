import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { requestIdMiddleware } from './common/http/request-id.middleware';
import { type AppConfig, appConfig } from './config/app.config';

export const API_PREFIX = 'api/v1';

/**
 * Wspólna konfiguracja HTTP dla `main.ts` i testów integracyjnych
 * (apps/api/docs/http-layer.md#globalna-konfiguracja-maints).
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<AppConfig>(appConfig.KEY);

  app.setGlobalPrefix(API_PREFIX);
  // Za nginx: prawdziwe IP klienta z X-Forwarded-For (limity żądań per IP).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Request id jako pierwszy, żeby miały go także błędy z kolejnych middleware.
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());

  // CORS tylko w dev (frontend na innym porcie). W produkcji jeden origin za nginx.
  if (config.corsOrigins.length > 0) {
    app.enableCors({ origin: config.corsOrigins, credentials: true });
  }

  app.enableShutdownHooks();
}
