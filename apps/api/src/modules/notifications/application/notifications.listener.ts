import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CalendarDate } from '../../../common/domain/calendar-date';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { type MailConfig, mailConfig } from '../../../config/mail.config';
import { GuestTokenService } from '../../reservations/application/guest-token.service';
import { guestCancellationDeadline } from '../../reservations/domain/cancellation-policy';
import {
  ReservationCancelled,
  ReservationCompleted,
  ReservationConfirmed,
  ReservationCreated,
  ReservationExpired,
  StayReminderDue,
} from '../../reservations/domain/events';
import {
  emailIdempotencyKey,
  type NotifiableEvent,
  type PlannedEmail,
  planEmails,
} from '../domain/email-plan';
import {
  EMAIL_LOGS_REPOSITORY,
  EMAIL_QUEUE,
  type EmailContext,
  type EmailLogsRepository,
  type EmailQueue,
  NOTIFICATION_DATA_REPOSITORY,
  type NotificationDataRepository,
  type ReservationNotificationData,
} from './ports';

/** Adres z `MAIL_FROM` (`Klucznik <no-reply@…>` albo sam adres). */
function senderAddress(mailFrom: string): string {
  return /<([^>]+)>/.exec(mailFrom)?.[1]?.trim() ?? mailFrom.trim();
}

/**
 * Cienki listener zdarzeń rezerwacji (docs/architecture/async-and-jobs.md#przepływ): wybiera e-maile,
 * zapisuje `EmailLog` i dodaje job do kolejki. Nie wysyła sam, więc błąd SMTP nie dotyka żądania HTTP.
 * Idempotencja: najpierw `EmailLog` z unikalnym kluczem; token gościa i job tylko dla nowego wpisu.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);
  private readonly fromAddress: string;

  constructor(
    @Inject(NOTIFICATION_DATA_REPOSITORY) private readonly data: NotificationDataRepository,
    @Inject(EMAIL_LOGS_REPOSITORY) private readonly logs: EmailLogsRepository,
    @Inject(EMAIL_QUEUE) private readonly queue: EmailQueue,
    @Inject(mailConfig.KEY) private readonly config: MailConfig,
    private readonly tokens: GuestTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.fromAddress = senderAddress(config.from);
  }

  @OnEvent(ReservationCreated.eventName)
  onCreated(event: ReservationCreated): Promise<void> {
    return this.notify(event.reservationId, { kind: 'created', source: event.source });
  }

  @OnEvent(ReservationConfirmed.eventName)
  onConfirmed(event: ReservationConfirmed): Promise<void> {
    return this.notify(event.reservationId, { kind: 'confirmed' });
  }

  @OnEvent(ReservationCancelled.eventName)
  onCancelled(event: ReservationCancelled): Promise<void> {
    return this.notify(event.reservationId, { kind: 'cancelled', cancelledBy: event.cancelledBy });
  }

  @OnEvent(ReservationExpired.eventName)
  onExpired(event: ReservationExpired): Promise<void> {
    return this.notify(event.reservationId, { kind: 'expired' });
  }

  @OnEvent(ReservationCompleted.eventName)
  onCompleted(event: ReservationCompleted): Promise<void> {
    return this.notify(event.reservationId, { kind: 'completed' });
  }

  @OnEvent(StayReminderDue.eventName)
  onReminderDue(event: StayReminderDue): Promise<void> {
    return this.notify(event.reservationId, { kind: 'reminder' });
  }

  async notify(reservationId: string, event: NotifiableEvent): Promise<void> {
    const planned = planEmails(event, true);
    if (planned.length === 0) {
      return;
    }
    const reservation = await this.data.find(reservationId);
    if (!reservation) {
      return;
    }
    for (const email of planEmails(event, reservation.guest.email !== null)) {
      await this.schedule(reservation, email);
    }
  }

  private async schedule(
    reservation: ReservationNotificationData,
    email: PlannedEmail,
  ): Promise<void> {
    const recipient =
      email.recipient === 'GUEST' ? reservation.guest.email! : reservation.ownerEmail;
    const emailLogId = await this.logs.createIfAbsent({
      reservationId: reservation.id,
      recipient,
      template: email.template,
      idempotencyKey: emailIdempotencyKey(email.template, reservation.id),
      createdAt: this.clock.now(),
    });
    if (!emailLogId) {
      return; // ten e-mail już zaplanowano (np. zdarzenie obsłużone drugi raz)
    }

    try {
      // Q-16: nowy token tylko dla faktycznie wysyłanego e-maila, więc duplikat nie unieważni linku.
      const token = email.withGuestLink ? await this.tokens.issue(reservation.id) : null;
      await this.queue.enqueue({
        emailLogId,
        template: email.template,
        to: recipient,
        from: { name: `${reservation.property.name} przez Klucznik`, address: this.fromAddress },
        replyTo: reservation.property.contactEmail,
        context: this.context(reservation, token),
      });
    } catch (error) {
      // Np. Redis niedostępny: e-mail nie zostanie wysłany, a admin zobaczy FAILED w logach.
      const message = error instanceof Error ? error.message : String(error);
      await this.logs.markFailedAttempt(emailLogId, `Queue error: ${message}`, true);
      this.logger.error(`Could not queue ${email.template} for reservation ${reservation.number}`);
    }
  }

  private context(reservation: ReservationNotificationData, token: string | null): EmailContext {
    const { property } = reservation;
    const checkIn = CalendarDate.parse(reservation.checkIn);
    const cancellable = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
    const base = this.config.publicUrl;
    return {
      property: {
        name: property.name,
        slug: property.slug,
        phone: property.phone,
        contactEmail: property.contactEmail,
        street: property.street,
        postalCode: property.postalCode,
        city: property.city,
        checkInTime: property.checkInTime,
        checkOutTime: property.checkOutTime,
      },
      reservation: {
        number: reservation.number,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: CalendarDate.parse(reservation.checkOut).diffDays(checkIn),
        guestsCount: reservation.guestsCount,
        totalPrice: reservation.totalPrice,
        currency: reservation.currency,
        guestNotes: reservation.guestNotes,
        expiresAt: reservation.expiresAt?.toISOString() ?? null,
        cancellableUntil: cancellable
          ? guestCancellationDeadline(checkIn, property.cancellationDeadlineDays).toString()
          : null,
        cancelledBy: reservation.cancelledBy,
        cancellationReason: reservation.cancellationReason,
      },
      room: reservation.room,
      guest: reservation.guest,
      links: {
        manage: token && `${base}/r/${token}`,
        panel: `${base}/panel/rezerwacje/${reservation.id}`,
        property: `${base}/o/${property.slug}`,
      },
    };
  }
}
