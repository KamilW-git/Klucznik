import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { TRANSACTION_MANAGER } from '../../common/transactions/transaction-manager';
import { ClsTransactionManager } from './cls-transaction-manager';
import { DatabaseHealthIndicator } from './prisma.health';
import { PrismaService } from './prisma.service';

/** Globalny dostęp do bazy dla repozytoriów: `PrismaService`, `TRANSACTION_MANAGER`, wskaźnik health. */
@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    PrismaService,
    DatabaseHealthIndicator,
    { provide: TRANSACTION_MANAGER, useClass: ClsTransactionManager },
  ],
  exports: [PrismaService, DatabaseHealthIndicator, TRANSACTION_MANAGER],
})
export class PrismaModule {}
