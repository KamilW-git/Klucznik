import type { MailAddress } from '../../../common/mail/mailer';
import type { EmailTemplate } from '../domain/email-plan';

export type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED';

/** Dane do szablonu (wszystkie pola obecne; `null` zamiast braku, bo szablony są `strict`). */
export interface EmailContext {
  property: {
    name: string;
    slug: string;
    phone: string | null;
    contactEmail: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    checkInTime: string;
    checkOutTime: string;
  };
  reservation: {
    number: string;
    /** `YYYY-MM-DD`. */
    checkIn: string;
    checkOut: string;
    nights: number;
    guestsCount: number;
    totalPrice: number;
    currency: string;
    guestNotes: string | null;
    /** ISO, tylko `PENDING`. */
    expiresAt: string | null;
    /** BR-08: ostatni dzień bezpłatnego anulowania (`YYYY-MM-DD`) lub `null`. */
    cancellableUntil: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
  };
  room: { name: string };
  guest: { firstName: string; lastName: string; email: string | null; phone: string | null };
  links: {
    /** `/r/:token` z nowym tokenem (Q-16) albo `null`. */
    manage: string | null;
    /** Szczegóły w panelu właściciela. */
    panel: string;
    /** Strona publiczna obiektu. */
    property: string;
  };
}

/** Dane joba kolejki `emails`. Surowy token gościa jest tylko tutaj (w linku), nigdy w `EmailLog`. */
export interface EmailJob {
  emailLogId: string;
  template: EmailTemplate;
  to: string;
  from: MailAddress;
  replyTo: string | null;
  context: EmailContext;
}

export interface EmailQueue {
  /** `jobId` = `emailLogId`: BullMQ nie doda drugiego joba dla tego samego `EmailLog`. */
  enqueue(job: EmailJob): Promise<void>;
}

export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');

/** Rezerwacja z danymi do e-maili (gość, pokój, obiekt, właściciel). */
export interface ReservationNotificationData {
  id: string;
  number: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalPrice: number;
  currency: string;
  guestNotes: string | null;
  expiresAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  room: { name: string };
  guest: { firstName: string; lastName: string; email: string | null; phone: string | null };
  property: EmailContext['property'] & { cancellationDeadlineDays: number };
  ownerEmail: string;
}

export interface NotificationDataRepository {
  find(reservationId: string): Promise<ReservationNotificationData | null>;
}

export const NOTIFICATION_DATA_REPOSITORY = Symbol('NOTIFICATION_DATA_REPOSITORY');

export interface EmailLogListItem {
  id: string;
  recipient: string;
  template: string;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
  reservationNumber: string | null;
}

export interface EmailLogsFilter {
  status?: EmailStatus;
  q?: string;
  /** Chwile graniczne `[createdFrom, createdTo)`. */
  createdFrom?: Date;
  createdTo?: Date;
  skip: number;
  take: number;
}

export interface EmailLogsRepository {
  /** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING`: `null`, gdy e-mail już zaplanowano. */
  createIfAbsent(log: {
    reservationId: string;
    recipient: string;
    template: EmailTemplate;
    idempotencyKey: string;
    /** `Clock.now()` (testy z ustalonym czasem). */
    createdAt: Date;
  }): Promise<string | null>;
  findStatus(id: string): Promise<EmailStatus | null>;
  markSent(id: string, at: Date): Promise<void>;
  /** `attempts + 1`, `lastError`; `final` ustawia `FAILED`. */
  markFailedAttempt(id: string, error: string, final: boolean): Promise<void>;
  list(filter: EmailLogsFilter): Promise<{ items: EmailLogListItem[]; total: number }>;
}

export const EMAIL_LOGS_REPOSITORY = Symbol('EMAIL_LOGS_REPOSITORY');
