import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';

import { parseEnv } from '../../config/env.schema';
import { ReservationsModule } from '../reservations/reservations.module';
import { EmailLogsService } from './application/email-logs.service';
import { NotificationsListener } from './application/notifications.listener';
import { NOTIFICATION_DATA_REPOSITORY } from './application/ports';
import { EmailDeliveryModule } from './email-delivery.module';
import { AdminEmailLogsController } from './http/admin-email-logs.controller';
import { PrismaNotificationDataRepository } from './infrastructure/prisma-notification-data.repository';
import {
  BullEmailQueueModule,
  InlineEmailQueueModule,
} from './infrastructure/queue/email-queue.modules';

const queueDriver = (env: NodeJS.ProcessEnv): string => parseEnv(env).EMAIL_QUEUE_DRIVER;

/**
 * Powiadomienia e-mail (docs/features/notifications.md): listener zdarzeń rezerwacji, kolejka
 * `emails` (BullMQ albo inline, `EMAIL_QUEUE_DRIVER`) i logi dla admina.
 */
@Module({
  imports: [
    EmailDeliveryModule,
    ReservationsModule,
    ConditionalModule.registerWhen(BullEmailQueueModule, (env) => queueDriver(env) === 'bullmq'),
    ConditionalModule.registerWhen(InlineEmailQueueModule, (env) => queueDriver(env) === 'inline'),
  ],
  controllers: [AdminEmailLogsController],
  providers: [
    NotificationsListener,
    EmailLogsService,
    { provide: NOTIFICATION_DATA_REPOSITORY, useClass: PrismaNotificationDataRepository },
  ],
})
export class NotificationsModule {}
