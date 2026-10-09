import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { type Clock, CLOCK } from '../../../common/domain/clock';
import { ReservationJobsService } from './reservation-jobs.service';

/**
 * Strefa harmonogramów. Dekoratory `@Cron` są wyliczane przy imporcie, więc nie czytają konfiguracji;
 * wartość odpowiada domyślnemu `APP_TIMEZONE`, a „dziś” w logice i tak pochodzi z `Clock`.
 */
const TIME_ZONE = 'Europe/Warsaw';

/**
 * Cienkie klasy jobów (docs/architecture/async-and-jobs.md#scheduler). Działają tylko przy
 * `SCHEDULER_ENABLED=true` (`SchedulerModule`); logika jest w `ReservationJobsService`.
 */
@Injectable()
export class ReservationJobsScheduler {
  private readonly logger = new Logger(ReservationJobsScheduler.name);

  constructor(
    private readonly jobs: ReservationJobsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Cron('*/15 * * * *', { name: 'expire-pending-reservations', timeZone: TIME_ZONE })
  expirePending(): Promise<void> {
    return this.run('expire-pending-reservations', () => this.jobs.expirePending(this.clock.now()));
  }

  @Cron('0 2 * * *', { name: 'complete-stays', timeZone: TIME_ZONE })
  completeStays(): Promise<void> {
    return this.run('complete-stays', () =>
      this.jobs.completeStays(this.clock.today(), this.clock.now()),
    );
  }

  @Cron('0 9 * * *', { name: 'send-stay-reminders', timeZone: TIME_ZONE })
  sendReminders(): Promise<void> {
    return this.run('send-stay-reminders', () =>
      this.jobs.sendReminders(this.clock.today(), this.clock.now()),
    );
  }

  private async run(name: string, job: () => Promise<number>): Promise<void> {
    const started = performance.now();
    try {
      const count = await job();
      this.logger.log(
        `${name}: ${count} reservation(s) in ${Math.round(performance.now() - started)} ms`,
      );
    } catch (error) {
      this.logger.error(`${name} failed`, error instanceof Error ? error.stack : String(error));
    }
  }
}
