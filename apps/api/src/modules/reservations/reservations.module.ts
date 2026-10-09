import { Module } from '@nestjs/common';

import { AvailabilityModule } from '../availability/availability.module';
import { GuestsModule } from '../guests/guests.module';
import { PhotosModule } from '../photos/photos.module';
import { GuestBookingService } from './application/guest-booking.service';
import { RESERVATIONS_QUERY_REPOSITORY } from './application/ports';
import { RESERVATIONS_REPOSITORY } from './application/reservation-ports';
import { ReservationsQueryService } from './application/reservations-query.service';
import { ReservationsService } from './application/reservations.service';
import { ReservationsController } from './http/reservations.controller';
import { PrismaReservationsQueryRepository } from './infrastructure/prisma-reservations-query.repository';
import { PrismaReservationsRepository } from './infrastructure/prisma-reservations.repository';

/**
 * Rezerwacje (docs/features/reservations.md): panel (M7), proces gościa (`GuestBookingService`, M8,
 * dla modułu `public`) i odczyt dla innych modułów (`ReservationsQueryService`: BR-10, pulpit).
 */
@Module({
  imports: [AvailabilityModule, GuestsModule, PhotosModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsQueryService,
    GuestBookingService,
    { provide: RESERVATIONS_REPOSITORY, useClass: PrismaReservationsRepository },
    { provide: RESERVATIONS_QUERY_REPOSITORY, useClass: PrismaReservationsQueryRepository },
  ],
  exports: [ReservationsQueryService, GuestBookingService],
})
export class ReservationsModule {}
