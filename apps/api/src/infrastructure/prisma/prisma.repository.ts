import { Injectable } from '@nestjs/common';
import { type Transaction, TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { PrismaService } from './prisma.service';

/**
 * Baza repozytoriów Prisma: `this.db` to bieżąca transakcja (`TRANSACTION_MANAGER.run`)
 * albo zwykły klient poza nią (apps/api/docs/persistence-layer.md#repozytoria).
 */
@Injectable()
export abstract class PrismaRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  protected get db(): Transaction<TransactionalAdapterPrisma<PrismaService>> {
    return this.txHost.tx;
  }
}
