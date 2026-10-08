import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type { TransactionManager } from '../../common/transactions/transaction-manager';
import type { PrismaService } from './prisma.service';

/**
 * Host transakcji dla repozytoriów: `this.txHost.tx.room.findMany(…)` używa bieżącej transakcji,
 * a poza nią zwykłego klienta.
 */
export type PrismaTransactionHost = TransactionHost<TransactionalAdapterPrisma<PrismaService>>;

/** `TransactionManager` na `prisma.$transaction` z kontekstem w AsyncLocalStorage (nestjs-cls). */
@Injectable()
export class ClsTransactionManager implements TransactionManager {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.txHost.withTransaction(fn);
  }
}
