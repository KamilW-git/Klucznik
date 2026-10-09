import { Module } from '@nestjs/common';

import { PricingFacade } from './application/pricing.facade';
import { RATES_REPOSITORY } from './application/ports';
import { RatesService } from './application/rates.service';
import { RatesController } from './http/rates.controller';
import { PrismaRatesRepository } from './infrastructure/prisma-rates.repository';

/** Cennik: stawki sezonowe i wycena pobytu (docs/features/pricing.md). Eksport: `PricingFacade`. */
@Module({
  controllers: [RatesController],
  providers: [
    RatesService,
    PricingFacade,
    { provide: RATES_REPOSITORY, useClass: PrismaRatesRepository },
  ],
  exports: [PricingFacade],
})
export class PricingModule {}
