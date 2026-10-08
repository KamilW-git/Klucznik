import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { createValidationPipe } from './common/errors/validation';
import { AppConfigModule } from './config/config.module';
import { ClockModule } from './infrastructure/clock/clock.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { HealthModule } from './modules/health/health.module';

/**
 * Moduł główny. Pipe i filtr są rejestrowane przez DI (`APP_PIPE`, `APP_FILTER`),
 * więc testy integracyjne z prawdziwym `AppModule` mają tę samą walidację i format błędów.
 * Middleware HTTP (prefiks, helmet, request id) ustawia `configureApp` w `app.setup.ts`.
 */
@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    PrismaModule,
    // Kontekst żądania (AsyncLocalStorage) i transakcje Prismy przez `TransactionHost`.
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
            sqlFlavor: 'postgresql',
          }),
        }),
      ],
    }),
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
