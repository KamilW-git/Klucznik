import { Module } from '@nestjs/common';

import { GuestsService } from './application/guests.service';
import { GUESTS_REPOSITORY } from './application/ports';
import { GuestsController } from './http/guests.controller';
import { PrismaGuestsRepository } from './infrastructure/prisma-guests.repository';

/** Goście obiektów (docs/features/guests.md). Eksport: `GuestsService` (`resolveForReservation`). */
@Module({
  controllers: [GuestsController],
  providers: [GuestsService, { provide: GUESTS_REPOSITORY, useClass: PrismaGuestsRepository }],
  exports: [GuestsService],
})
export class GuestsModule {}
