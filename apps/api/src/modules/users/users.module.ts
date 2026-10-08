import { Module } from '@nestjs/common';

import { PropertiesModule } from '../properties/properties.module';
import { OwnersService } from './application/owners.service';
import { OWNERS_REPOSITORY } from './application/ports';
import { AdminOwnersController } from './http/admin-owners.controller';
import { PrismaOwnersRepository } from './infrastructure/prisma-owners.repository';

/**
 * Konta właścicieli zarządzane przez admina. Zależności: `PropertiesService` (obiekt przy zakładaniu)
 * i `SessionsService` z globalnego `AuthModule` (unieważnianie sesji przy blokadzie).
 */
@Module({
  imports: [PropertiesModule],
  controllers: [AdminOwnersController],
  providers: [OwnersService, { provide: OWNERS_REPOSITORY, useClass: PrismaOwnersRepository }],
})
export class UsersModule {}
