import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { type DatabaseConfig, databaseConfig } from '../../config/database.config';
import { PrismaClient } from './generated/client';

/**
 * Klient Prismy (driver adapter `pg`, wymagany od Prismy 7).
 * Używany wyłącznie w `infrastructure/` (repozytoria); w transakcji przez `TransactionHost`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(databaseConfig.KEY) config: DatabaseConfig) {
    super({
      adapter: new PrismaPg({ connectionString: config.url }),
      log: ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
