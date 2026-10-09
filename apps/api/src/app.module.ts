import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { createValidationPipe } from './common/errors/validation';
import { type ThrottleConfig, throttleConfig } from './config/auth.config';
import { AppConfigModule } from './config/config.module';
import { AccessModule } from './infrastructure/access/access.module';
import { ClockModule } from './infrastructure/clock/clock.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { SecurityModule } from './infrastructure/security/security.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PhotosModule } from './modules/photos/photos.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Moduł główny. Pipe, filtr i guardy są rejestrowane przez DI (`APP_*`), więc testy integracyjne
 * z prawdziwym `AppModule` mają tę samą walidację, autoryzację i format błędów.
 * Middleware HTTP (prefiks, helmet, request id) ustawia `configureApp` w `app.setup.ts`.
 */
@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    PrismaModule,
    SecurityModule,
    StorageModule,
    AccessModule,
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
    // Globalny limit per IP; trasy auth nadpisują go przez @Throttle (docs/architecture/security.md).
    ThrottlerModule.forRootAsync({
      inject: [throttleConfig.KEY],
      useFactory: (config: ThrottleConfig) => [
        { name: 'default', ttl: config.ttlSeconds * 1000, limit: config.limit },
      ],
    }),
    AuthModule,
    UsersModule,
    PropertiesModule,
    RoomsModule,
    PhotosModule,
    PricingModule,
    AvailabilityModule,
    ReservationsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Kolejność ma znaczenie: limit żądań → access token (401) → rola (403).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
