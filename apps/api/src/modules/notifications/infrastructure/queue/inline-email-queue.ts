import { Injectable, Logger } from '@nestjs/common';

import { EmailDeliveryService } from '../../application/email-delivery.service';
import type { EmailJob, EmailQueue } from '../../application/ports';

/**
 * `EMAIL_QUEUE` bez Redisa (`EMAIL_QUEUE_DRIVER=inline`, testy integracyjne): wysyła od razu,
 * jedną próbą. Błąd wysyłki zostaje w `EmailLog` (`FAILED`) i nie wychodzi poza kolejkę.
 */
@Injectable()
export class InlineEmailQueue implements EmailQueue {
  private readonly logger = new Logger(InlineEmailQueue.name);

  constructor(private readonly delivery: EmailDeliveryService) {}

  async enqueue(job: EmailJob): Promise<void> {
    try {
      await this.delivery.deliver(job, { number: 1, max: 1 });
    } catch (error) {
      this.logger.warn(
        `E-mail ${job.template} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
