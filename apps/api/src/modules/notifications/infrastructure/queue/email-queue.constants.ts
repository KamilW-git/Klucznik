import type { JobsOptions } from 'bullmq';

export const EMAILS_QUEUE_NAME = 'emails';

/** docs/architecture/async-and-jobs.md#kolejka-e-maili-bullmq */
export const EMAIL_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: true,
  removeOnFail: 1000,
};

export const EMAIL_WORKER_CONCURRENCY = 5;
