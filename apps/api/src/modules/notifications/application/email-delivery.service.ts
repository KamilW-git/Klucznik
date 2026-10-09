import { Inject, Injectable } from '@nestjs/common';

import { type Clock, CLOCK } from '../../../common/domain/clock';
import {
  MAILER,
  type Mailer,
  TEMPLATE_RENDERER,
  type TemplateRenderer,
} from '../../../common/mail/mailer';
import { EMAIL_LOGS_REPOSITORY, type EmailJob, type EmailLogsRepository } from './ports';

/** Treść błędu w `EmailLog.lastError` (bez stosu, ograniczona długość). */
const MAX_ERROR_LENGTH = 1000;

/**
 * Wysyłka jednego e-maila z kolejki (worker, docs/architecture/async-and-jobs.md#kolejka-e-maili-bullmq):
 * 1. `SENT` → koniec (ponowienie joba po udanej wysyłce nie wyśle drugi raz),
 * 2. render szablonu i wysyłka przez `MAILER`,
 * 3. sukces → `SENT`; błąd → `attempts + 1` i `lastError`, po ostatniej próbie `FAILED`,
 *    a błąd leci dalej, żeby BullMQ ponowił joba.
 */
@Injectable()
export class EmailDeliveryService {
  constructor(
    @Inject(EMAIL_LOGS_REPOSITORY) private readonly logs: EmailLogsRepository,
    @Inject(TEMPLATE_RENDERER) private readonly renderer: TemplateRenderer,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async deliver(job: EmailJob, attempt: { number: number; max: number }): Promise<void> {
    const status = await this.logs.findStatus(job.emailLogId);
    if (status === null || status === 'SENT') {
      return;
    }
    try {
      const rendered = this.renderer.render(job.template, job.context);
      await this.mailer.send({
        from: job.from,
        to: job.to,
        replyTo: job.replyTo ?? undefined,
        ...rendered,
      });
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(
        0,
        MAX_ERROR_LENGTH,
      );
      await this.logs.markFailedAttempt(job.emailLogId, message, attempt.number >= attempt.max);
      throw error;
    }
    await this.logs.markSent(job.emailLogId, this.clock.now());
  }
}
