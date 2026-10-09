import type { DomainEvent } from '../../../common/domain/domain-event';
import type { ActorType, ReservationSource } from './reservation-status';

/**
 * Zdarzenia rezerwacji (docs/architecture/async-and-jobs.md#zdarzenia-domenowe), publikowane po commicie.
 * Nie niosą surowego tokenu gościa: link do e-maila generuje listener (Q-16).
 */
abstract class ReservationEvent implements DomainEvent {
  abstract readonly name: string;

  constructor(
    readonly reservationId: string,
    readonly occurredAt: Date,
  ) {}
}

export class ReservationCreated extends ReservationEvent {
  static readonly eventName = 'reservation.created';
  readonly name = ReservationCreated.eventName;

  constructor(
    reservationId: string,
    readonly source: ReservationSource,
    occurredAt: Date,
  ) {
    super(reservationId, occurredAt);
  }
}

export class ReservationConfirmed extends ReservationEvent {
  static readonly eventName = 'reservation.confirmed';
  readonly name = ReservationConfirmed.eventName;
}

export class ReservationCancelled extends ReservationEvent {
  static readonly eventName = 'reservation.cancelled';
  readonly name = ReservationCancelled.eventName;

  constructor(
    reservationId: string,
    readonly cancelledBy: ActorType,
    occurredAt: Date,
  ) {
    super(reservationId, occurredAt);
  }
}

/** BR-07 */
export class ReservationExpired extends ReservationEvent {
  static readonly eventName = 'reservation.expired';
  readonly name = ReservationExpired.eventName;
}

export class ReservationCompleted extends ReservationEvent {
  static readonly eventName = 'reservation.completed';
  readonly name = ReservationCompleted.eventName;
}

/** Q-09: przypomnienie 2 dni przed przyjazdem. */
export class StayReminderDue extends ReservationEvent {
  static readonly eventName = 'reservation.stay-reminder-due';
  readonly name = StayReminderDue.eventName;
}
