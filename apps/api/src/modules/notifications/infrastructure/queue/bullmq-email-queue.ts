import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import type { EmailJob, EmailQueue } from '../../application/ports';
import { EMAIL_JOB_OPTIONS, EMAILS_QUEUE_NAME } from './email-queue.constants';

/**
 * `EMAIL_QUEUE` na BullMQ. `jobId` = id `EmailLog`, bo BullMQ nie przyjmuje `:` w id
 * (a `idempotencyKey` go zawiera); duplikaty wyklucza już unikalny `idempotencyKey` w bazie.
 */
@Injectable()
export class BullMqEmailQueue implements EmailQueue {
  constructor(@InjectQueue(EMAILS_QUEUE_NAME) private readonly queue: Queue<EmailJob>) {}

  async enqueue(job: EmailJob): Promise<void> {
    await this.queue.add(job.template, job, { ...EMAIL_JOB_OPTIONS, jobId: job.emailLogId });
  }
}
