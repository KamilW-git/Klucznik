import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import type { Queue } from 'bullmq';

import type { HealthIndicator } from '../../../../common/health/health-indicator';
import { EMAILS_QUEUE_NAME } from './email-queue.constants';

const PING_TIMEOUT_MS = 1000;

/** Wskaźnik `redis` dla `/health`: `PING` przez połączenie kolejki e-maili, z limitem czasu. */
@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    @InjectQueue(EMAILS_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    let timer: NodeJS.Timeout | undefined;
    try {
      const client = await this.queue.getBackend().client;
      await Promise.race([
        client.runCommand('ping', []), // nazwa metody klienta (ioredis: `ping`)
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout after ${PING_TIMEOUT_MS} ms`)),
            PING_TIMEOUT_MS,
          );
        }),
      ]);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : String(error) });
    } finally {
      clearTimeout(timer);
    }
  }
}
