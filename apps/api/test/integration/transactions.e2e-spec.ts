import { TransactionHost } from '@nestjs-cls/transactional';

import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../src/common/transactions/transaction-manager';
import type { PrismaTransactionHost } from '../../src/infrastructure/prisma/cls-transaction-manager';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const userData = (email: string) => ({
  email,
  passwordHash: 'x',
  firstName: 'Jan',
  lastName: 'Nowak',
  role: 'OWNER' as const,
});

describe('TransactionManager (Prisma + CLS)', () => {
  let ctx: TestApp;
  let tx: TransactionManager;
  // Host transakcji, którego używają repozytoria (`this.txHost.tx`).
  let txHost: PrismaTransactionHost;

  beforeAll(async () => {
    ctx = await createTestApp();
    tx = ctx.app.get<TransactionManager>(TRANSACTION_MANAGER);
    txHost = ctx.app.get<PrismaTransactionHost>(TransactionHost);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it('commits writes made through the transaction host', async () => {
    await tx.run(async () => {
      await txHost.tx.user.create({ data: userData('a@test.klucznik.local') });
      await txHost.tx.user.create({ data: userData('b@test.klucznik.local') });
    });

    await expect(ctx.prisma.user.count()).resolves.toBe(2);
  });

  it('returns the callback result', async () => {
    await expect(tx.run(() => Promise.resolve(42))).resolves.toBe(42);
  });

  it('rolls back all writes when the callback throws', async () => {
    await expect(
      tx.run(async () => {
        await txHost.tx.user.create({ data: userData('rollback@test.klucznik.local') });
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');

    await expect(ctx.prisma.user.count()).resolves.toBe(0);
  });

  it('rolls back when a later write violates a constraint', async () => {
    await expect(
      tx.run(async () => {
        await txHost.tx.user.create({ data: userData('dup@test.klucznik.local') });
        await txHost.tx.user.create({ data: userData('dup@test.klucznik.local') });
      }),
    ).rejects.toThrow();

    await expect(ctx.prisma.user.count()).resolves.toBe(0);
  });
});
