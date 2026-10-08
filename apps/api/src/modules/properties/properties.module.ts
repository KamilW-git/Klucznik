import { Module } from '@nestjs/common';

import { PROPERTIES_REPOSITORY } from './application/ports';
import { PropertiesService } from './application/properties.service';
import { AdminPropertiesController } from './http/admin-properties.controller';
import { PrismaPropertiesRepository } from './infrastructure/prisma-properties.repository';

/** Obiekty (docs/features/properties.md). Eksport: `PropertiesService` (zakładanie obiektu z właścicielem). */
@Module({
  controllers: [AdminPropertiesController],
  providers: [
    PropertiesService,
    { provide: PROPERTIES_REPOSITORY, useClass: PrismaPropertiesRepository },
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
