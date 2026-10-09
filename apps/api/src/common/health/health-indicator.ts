import type { HealthIndicatorResult } from '@nestjs/terminus';

/** Dodatkowy wskaźnik `/health` dostarczany przez moduł, który zależy od usługi (np. Redis). */
export interface HealthIndicator {
  check(key: string): Promise<HealthIndicatorResult>;
}

/** Wskaźnik `redis`; obecny tylko przy `EMAIL_QUEUE_DRIVER=bullmq`. */
export const REDIS_HEALTH_INDICATOR = Symbol('REDIS_HEALTH_INDICATOR');
