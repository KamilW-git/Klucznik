import { Inject, Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { EVENT_BUS, type EventBus } from '../../../common/events/event-bus';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { ReservationCompleted, ReservationExpired, StayReminderDue } from '../domain/events';
import {
  type NewReservationEvent,
  RESERVATIONS_REPOSITORY,
  type ReservationsRepository,
} from './reservation-ports';

/** Przypomnienie wysyłamy 2 dni przed przyjazdem (Q-09). */
export const REMINDER_DAYS_BEFORE_CHECK_IN = 2;

/**
 * Logika zadań cyklicznych (docs/architecture/async-and-jobs.md#scheduler). Klasy `@Cron` tylko ją
 * wywołują, więc testy uruchamiają metody bezpośrednio z ustalonym czasem. Każda metoda zmienia
 * stan zapisem warunkowym i publikuje zdarzenia tylko dla faktycznie zmienionych rezerwacji.
 */
@Injectable()
export class ReservationJobsService {
  constructor(
    @Inject(RESERVATIONS_REPOSITORY) private readonly reservations: ReservationsRepository,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(EVENT_BUS) private readonly events: EventBus,
  ) {}

  // BR-07: niepotwierdzone po terminie wygasają i zwalniają termin (EXCLUDE obejmuje tylko PENDING/CONFIRMED).
  async expirePending(now: Date): Promise<number> {
    const ids = await this.tx.run(async () => {
      const expired = await this.reservations.expirePending(now);
      await this.reservations.addEvents(expired.map((id) => systemEvent(id, 'EXPIRED')));
      return expired;
    });
    await this.events.publish(ids.map((id) => new ReservationExpired(id, now)));
    return ids.length;
  }

  // BR-06: CONFIRMED → COMPLETED po dniu wyjazdu (przejście systemowe).
  async completeStays(today: CalendarDate, now: Date): Promise<number> {
    const ids = await this.tx.run(async () => {
      const completed = await this.reservations.completeStays(today);
      await this.reservations.addEvents(completed.map((id) => systemEvent(id, 'COMPLETED')));
      return completed;
    });
    await this.events.publish(ids.map((id) => new ReservationCompleted(id, now)));
    return ids.length;
  }

  // Q-09: e-mail do gościa 2 dni przed przyjazdem, najwyżej raz (`reminderSentAt`).
  async sendReminders(today: CalendarDate, now: Date): Promise<number> {
    const ids = await this.reservations.markRemindersDue(
      today.addDays(REMINDER_DAYS_BEFORE_CHECK_IN),
      now,
    );
    await this.events.publish(ids.map((id) => new StayReminderDue(id, now)));
    return ids.length;
  }
}

function systemEvent(reservationId: string, type: 'EXPIRED' | 'COMPLETED'): NewReservationEvent {
  return { reservationId, type, actorType: 'SYSTEM', actorUserId: null };
}
