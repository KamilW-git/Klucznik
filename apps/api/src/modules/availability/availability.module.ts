import { Module } from '@nestjs/common';

import { PricingModule } from '../pricing/pricing.module';
import { AvailabilityService } from './application/availability.service';
import { BlocksService } from './application/blocks.service';
import { CalendarService } from './application/calendar.service';
import { AVAILABILITY_REPOSITORY, BLOCKS_REPOSITORY } from './application/ports';
import { AvailabilityController } from './http/availability.controller';
import { BlocksController } from './http/blocks.controller';
import { PrismaAvailabilityRepository } from './infrastructure/prisma-availability.repository';
import { PrismaBlocksRepository } from './infrastructure/prisma-blocks.repository';

/**
 * Blokady terminów, algorytm dostępności, wycena i kalendarz (docs/features/availability.md).
 * Eksport: `AvailabilityService` (rezerwacje M7, strona publiczna M8).
 */
@Module({
  imports: [PricingModule],
  controllers: [BlocksController, AvailabilityController],
  providers: [
    AvailabilityService,
    BlocksService,
    CalendarService,
    { provide: AVAILABILITY_REPOSITORY, useClass: PrismaAvailabilityRepository },
    { provide: BLOCKS_REPOSITORY, useClass: PrismaBlocksRepository },
  ],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
