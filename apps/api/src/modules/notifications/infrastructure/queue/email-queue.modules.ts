import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { REDIS_HEALTH_INDICATOR } from '../../../../common/health/health-indicator';
import { type RedisConfig, redisConfig } from '../../../../config/mail.config';
import { EMAIL_QUEUE } from '../../application/ports';
import { EmailDeliveryModule } from '../../email-delivery.module';
import { BullMqEmailQueue } from './bullmq-email-queue';
import { EMAILS_QUEUE_NAME } from './email-queue.constants';
import { EmailProcessor } from './email.processor';
import { InlineEmailQueue } from './inline-email-queue';
import { RedisHealthIndicator } from './redis.health';

/**
 * `EMAIL_QUEUE_DRIVER=bullmq` (domyślnie): kolejka `emails` w Redisie, worker w tym samym procesie
 * i wskaźnik `redis` dla `/health` (globalny token, bo czyta go `HealthModule`).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (config: RedisConfig) => ({
        // `null`: worker BullMQ czeka na Redisa zamiast przerywać polecenia po kilku próbach.
        connection: { host: config.host, port: config.port, maxRetriesPerRequest: null },
      }),
    }),
    BullModule.registerQueue({ name: EMAILS_QUEUE_NAME }),
    TerminusModule,
    EmailDeliveryModule,
  ],
  providers: [
    EmailProcessor,
    { provide: EMAIL_QUEUE, useClass: BullMqEmailQueue },
    { provide: REDIS_HEALTH_INDICATOR, useClass: RedisHealthIndicator },
  ],
  exports: [EMAIL_QUEUE, REDIS_HEALTH_INDICATOR],
})
export class BullEmailQueueModule {}

/** `EMAIL_QUEUE_DRIVER=inline`: wysyłka od razu, bez Redisa (testy integracyjne). */
@Module({
  imports: [EmailDeliveryModule],
  providers: [{ provide: EMAIL_QUEUE, useClass: InlineEmailQueue }],
  exports: [EMAIL_QUEUE],
})
export class InlineEmailQueueModule {}
