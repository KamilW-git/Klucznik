import { Module } from '@nestjs/common';

import { AvailabilityModule } from '../availability/availability.module';
import { PhotosModule } from '../photos/photos.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { PUBLIC_PROPERTIES_REPOSITORY } from './application/ports';
import { PublicBookingService } from './application/public-booking.service';
import { PublicController } from './http/public.controller';
import { PrismaPublicPropertiesRepository } from './infrastructure/prisma-public-properties.repository';

/** Strona publiczna obiektu i proces gościa (docs/features/guest-booking.md). */
@Module({
  imports: [AvailabilityModule, PhotosModule, ReservationsModule],
  controllers: [PublicController],
  providers: [
    PublicBookingService,
    { provide: PUBLIC_PROPERTIES_REPOSITORY, useClass: PrismaPublicPropertiesRepository },
  ],
})
export class PublicModule {}
