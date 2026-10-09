import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { EmailDeliveryService } from '../../application/email-delivery.service';
import type { EmailJob } from '../../application/ports';
import { EMAIL_WORKER_CONCURRENCY, EMAILS_QUEUE_NAME } from './email-queue.constants';

/** Worker kolejki `emails`: wyjątek z `deliver` uruchamia ponowienie BullMQ (backoff wykładniczy). */
@Processor(EMAILS_QUEUE_NAME, { concurrency: EMAIL_WORKER_CONCURRENCY })
export class EmailProcessor extends WorkerHost {
  constructor(private readonly delivery: EmailDeliveryService) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    await this.delivery.deliver(job.data, {
      number: job.attemptsMade + 1,
      max: job.opts.attempts ?? 1,
    });
  }
}
