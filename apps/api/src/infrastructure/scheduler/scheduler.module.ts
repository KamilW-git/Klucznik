import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { parseEnv } from '../../config/env.schema';

/**
 * Joby cykliczne (`@Cron`) działają tylko przy `SCHEDULER_ENABLED=true`. W testach i na dodatkowych
 * instancjach scheduler jest wyłączony, a logikę jobów wywołuje się z serwisów (async-and-jobs.md).
 */
@Module({
  imports: [
    ConditionalModule.registerWhen(
      ScheduleModule.forRoot(),
      (env: NodeJS.ProcessEnv) => parseEnv(env).SCHEDULER_ENABLED,
    ),
  ],
})
export class SchedulerModule {}
