import { Module } from '@nestjs/common';

import { EmailDeliveryService } from './application/email-delivery.service';
import { EMAIL_LOGS_REPOSITORY } from './application/ports';
import { PrismaEmailLogsRepository } from './infrastructure/prisma-email-logs.repository';

/** Wysyłka jednego e-maila i `EmailLog`: wspólne dla kolejki BullMQ, kolejki inline i listenera. */
@Module({
  providers: [
    EmailDeliveryService,
    { provide: EMAIL_LOGS_REPOSITORY, useClass: PrismaEmailLogsRepository },
  ],
  exports: [EmailDeliveryService, EMAIL_LOGS_REPOSITORY],
})
export class EmailDeliveryModule {}
