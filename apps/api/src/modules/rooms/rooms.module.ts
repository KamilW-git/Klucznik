import { Module } from '@nestjs/common';

import { PhotosModule } from '../photos/photos.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { ROOMS_REPOSITORY } from './application/ports';
import { RoomsService } from './application/rooms.service';
import { RoomsController } from './http/rooms.controller';
import { PrismaRoomsRepository } from './infrastructure/prisma-rooms.repository';

/** Pokoje i domki (docs/features/rooms.md). */
@Module({
  imports: [PhotosModule, ReservationsModule],
  controllers: [RoomsController],
  providers: [RoomsService, { provide: ROOMS_REPOSITORY, useClass: PrismaRoomsRepository }],
  exports: [RoomsService],
})
export class RoomsModule {}
