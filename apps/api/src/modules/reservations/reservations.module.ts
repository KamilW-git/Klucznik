import { Module } from '@nestjs/common';

import { AvailabilityModule } from '../availability/availability.module';
import { GuestsModule } from '../guests/guests.module';
import { RESERVATIONS_QUERY_REPOSITORY } from './application/ports';
import { RESERVATIONS_REPOSITORY } from './application/reservation-ports';
import { ReservationsQueryService } from './application/reservations-query.service';
import { ReservationsService } from './application/reservations.service';
import { ReservationsController } from './http/reservations.controller';
import { PrismaReservationsQueryRepository } from './infrastructure/prisma-reservations-query.repository';
import { PrismaReservationsRepository } from './infrastructure/prisma-reservations.repository';

/**
 * Rezerwacje (docs/features/reservations.md): panel (M7) i odczyt dla innych modułów
 * (`ReservationsQueryService`: BR-10, pulpit).
 */
@Module({
  imports: [AvailabilityModule, GuestsModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsQueryService,
    { provide: RESERVATIONS_REPOSITORY, useClass: PrismaReservationsRepository },
    { provide: RESERVATIONS_QUERY_REPOSITORY, useClass: PrismaReservationsQueryRepository },
  ],
  exports: [ReservationsQueryService],
})
export class ReservationsModule {}
