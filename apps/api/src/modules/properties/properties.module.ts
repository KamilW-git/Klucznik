import { Module } from '@nestjs/common';

import { PhotosModule } from '../photos/photos.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { PROPERTIES_REPOSITORY } from './application/ports';
import { PropertiesService } from './application/properties.service';
import { AdminPropertiesController } from './http/admin-properties.controller';
import { PropertiesController } from './http/properties.controller';
import { PrismaPropertiesRepository } from './infrastructure/prisma-properties.repository';

/** Obiekty i pulpit (docs/features/properties.md). Eksport: `PropertiesService`. */
@Module({
  imports: [PhotosModule, ReservationsModule],
  controllers: [PropertiesController, AdminPropertiesController],
  providers: [
    PropertiesService,
    { provide: PROPERTIES_REPOSITORY, useClass: PrismaPropertiesRepository },
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
