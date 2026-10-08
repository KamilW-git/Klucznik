import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';

import { PrismaService } from './prisma.service';

const PING_TIMEOUT_MS = 1000;

/**
 * Wskaźnik `database` dla `/health`: `SELECT 1` z limitem czasu.
 * Własny zamiast `PrismaHealthIndicator` z terminusa, który rozpoznaje bazę SQL po treści błędu
 * `$runCommandRaw` (zależność od wewnętrznych komunikatów Prismy).
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async pingCheck(key = 'database'): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, PING_TIMEOUT_MS);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : String(error) });
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
