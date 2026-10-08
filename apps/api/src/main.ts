import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';
import { type AppConfig, appConfig } from './config/app.config';
import { SWAGGER_PATH, setupSwagger } from './openapi/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(appConfig.KEY);

  configureApp(app);
  if (config.swaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`API: http://localhost:${config.port}/${API_PREFIX}`);
  if (config.swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${config.port}/${SWAGGER_PATH}`);
  }
}

void bootstrap();
