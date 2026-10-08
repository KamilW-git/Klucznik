import { Module } from '@nestjs/common';

import { RESERVATIONS_QUERY_REPOSITORY } from './application/ports';
import { ReservationsQueryService } from './application/reservations-query.service';
import { PrismaReservationsQueryRepository } from './infrastructure/prisma-reservations-query.repository';

/**
 * Rezerwacje (docs/features/reservations.md). Od M5 tylko odczyt dla innych modułów
 * (`ReservationsQueryService`: BR-10, pulpit); przypadki użycia i endpointy dochodzą w M7.
 */
@Module({
  providers: [
    ReservationsQueryService,
    { provide: RESERVATIONS_QUERY_REPOSITORY, useClass: PrismaReservationsQueryRepository },
  ],
  exports: [ReservationsQueryService],
})
export class ReservationsModule {}
