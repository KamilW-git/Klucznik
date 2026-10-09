import { CalendarDate } from '../../common/domain/calendar-date';
import { FixedClock } from '../../common/domain/clock';
import { startOfDayInZone } from '../../common/domain/time-zone';
import type { Mailer, MailMessage, TemplateRenderer } from '../../common/mail/mailer';
import type { MailConfig } from '../../config/mail.config';
import type { GuestTokenService } from '../reservations/application/guest-token.service';
import { EmailDeliveryService } from './application/email-delivery.service';
import { NotificationsListener } from './application/notifications.listener';
import type {
  EmailJob,
  EmailLogsRepository,
  EmailQueue,
  EmailStatus,
  NotificationDataRepository,
  ReservationNotificationData,
} from './application/ports';
import { emailIdempotencyKey, planEmails } from './domain/email-plan';

describe('planEmails', () => {
  it('ONLINE created → reservation-received with a link + owner-new-reservation', () => {
    expect(planEmails({ kind: 'created', source: 'ONLINE' }, true)).toEqual([
      { template: 'reservation-received', recipient: 'GUEST', withGuestLink: true },
      { template: 'owner-new-reservation', recipient: 'OWNER', withGuestLink: false },
    ]);
  });

  it('MANUAL created → reservation-confirmed only when the guest has an e-mail (Q-03)', () => {
    expect(planEmails({ kind: 'created', source: 'MANUAL' }, true).map((e) => e.template)).toEqual([
      'reservation-confirmed',
    ]);
    expect(planEmails({ kind: 'created', source: 'MANUAL' }, false)).toEqual([]);
  });

  it('cancelled by the guest also informs the owner; by the owner only the guest', () => {
    expect(
      planEmails({ kind: 'cancelled', cancelledBy: 'GUEST' }, true).map((e) => e.template),
    ).toEqual(['reservation-cancelled', 'owner-reservation-cancelled']);
    expect(
      planEmails({ kind: 'cancelled', cancelledBy: 'OWNER' }, true).map((e) => e.template),
    ).toEqual(['reservation-cancelled']);
    expect(
      planEmails({ kind: 'cancelled', cancelledBy: 'GUEST' }, false).map((e) => e.template),
    ).toEqual(['owner-reservation-cancelled']);
  });

  it.each([
    [{ kind: 'confirmed' } as const, ['reservation-confirmed']],
    [{ kind: 'expired' } as const, ['reservation-expired']],
    [{ kind: 'reminder' } as const, ['stay-reminder']],
    [{ kind: 'completed' } as const, []],
  ])('%j → %j', (event, templates) => {
    expect(planEmails(event, true).map((e) => e.template)).toEqual(templates);
  });

  it('idempotency key: <template>:<reservationId>', () => {
    expect(emailIdempotencyKey('stay-reminder', 'r-1')).toBe('stay-reminder:r-1');
  });
});

class InMemoryEmailLogs implements EmailLogsRepository {
  readonly rows = new Map<
    string,
    { key: string; status: EmailStatus; attempts: number; lastError: string | null }
  >();

  createIfAbsent(log: { idempotencyKey: string }): Promise<string | null> {
    if ([...this.rows.values()].some((row) => row.key === log.idempotencyKey)) {
      return Promise.resolve(null);
    }
    const id = `log-${this.rows.size + 1}`;
    this.rows.set(id, { key: log.idempotencyKey, status: 'QUEUED', attempts: 0, lastError: null });
    return Promise.resolve(id);
  }

  findStatus(id: string): Promise<EmailStatus | null> {
    return Promise.resolve(this.rows.get(id)?.status ?? null);
  }

  markSent(id: string): Promise<void> {
    const row = this.rows.get(id)!;
    Object.assign(row, { status: 'SENT', attempts: row.attempts + 1 });
    return Promise.resolve();
  }

  markFailedAttempt(id: string, error: string, final: boolean): Promise<void> {
    const row = this.rows.get(id)!;
    Object.assign(row, {
      attempts: row.attempts + 1,
      lastError: error,
      status: final ? 'FAILED' : row.status,
    });
    return Promise.resolve();
  }

  list(): never {
    throw new Error('not used');
  }
}

const reservation: ReservationNotificationData = {
  id: 'res-1',
  number: 'KL-2026-000001',
  status: 'PENDING',
  checkIn: '2026-08-14',
  checkOut: '2026-08-18',
  guestsCount: 2,
  totalPrice: 148_000,
  currency: 'PLN',
  guestNotes: null,
  expiresAt: new Date('2026-08-03T08:00:00Z'),
  cancelledBy: null,
  cancellationReason: null,
  room: { name: 'Domek Sosna' },
  guest: { firstName: 'Anna', lastName: 'Kowalska', email: 'anna@example.com', phone: null },
  property: {
    name: 'Zielona Zagroda',
    slug: 'zielona-zagroda',
    phone: null,
    contactEmail: 'kontakt@zagroda.example.com',
    street: null,
    postalCode: null,
    city: 'Mikołajki',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationDeadlineDays: 7,
  },
  ownerEmail: 'owner@example.com',
};

describe('NotificationsListener', () => {
  let logs: InMemoryEmailLogs;
  let jobs: EmailJob[];
  let issued: number;
  let listener: NotificationsListener;

  beforeEach(() => {
    logs = new InMemoryEmailLogs();
    jobs = [];
    issued = 0;
    const data: NotificationDataRepository = { find: () => Promise.resolve(reservation) };
    const queue: EmailQueue = {
      enqueue: (job) => {
        jobs.push(job);
        return Promise.resolve();
      },
    };
    const tokens = {
      issue: () => Promise.resolve(`token-${++issued}`),
    } as unknown as GuestTokenService;
    listener = new NotificationsListener(
      data,
      logs,
      queue,
      { from: 'Klucznik <no-reply@klucznik.local>', publicUrl: 'http://app.test' } as MailConfig,
      tokens,
      FixedClock.at('2026-08-01T10:00:00+02:00'),
    );
  });

  it('ReservationCreated (ONLINE) → 2 EmailLogs and jobs with the right keys, sender and links', async () => {
    await listener.notify('res-1', { kind: 'created', source: 'ONLINE' });

    expect([...logs.rows.values()].map((row) => row.key)).toEqual([
      'reservation-received:res-1',
      'owner-new-reservation:res-1',
    ]);
    expect(jobs.map((job) => [job.template, job.to])).toEqual([
      ['reservation-received', 'anna@example.com'],
      ['owner-new-reservation', 'owner@example.com'],
    ]);
    expect(jobs[0]).toMatchObject({
      from: { name: 'Zielona Zagroda przez Klucznik', address: 'no-reply@klucznik.local' },
      replyTo: 'kontakt@zagroda.example.com',
      context: {
        links: {
          manage: 'http://app.test/r/token-1',
          panel: 'http://app.test/panel/rezerwacje/res-1',
          property: 'http://app.test/o/zielona-zagroda',
        },
        reservation: { nights: 4, cancellableUntil: '2026-08-07' },
      },
    });
    expect(jobs[1]?.context.links.manage).toBeNull();
  });

  it('the same event twice → no duplicate e-mail and no second token (Q-16)', async () => {
    await listener.notify('res-1', { kind: 'created', source: 'ONLINE' });
    await listener.notify('res-1', { kind: 'created', source: 'ONLINE' });

    expect(logs.rows.size).toBe(2);
    expect(jobs).toHaveLength(2);
    expect(issued).toBe(1);
  });

  it('a queue failure marks the EmailLog FAILED instead of throwing', async () => {
    listener = new NotificationsListener(
      { find: () => Promise.resolve(reservation) },
      logs,
      { enqueue: () => Promise.reject(new Error('Redis down')) },
      { from: 'no-reply@klucznik.local', publicUrl: 'http://app.test' } as MailConfig,
      { issue: () => Promise.resolve('t') } as unknown as GuestTokenService,
      FixedClock.at('2026-08-01T10:00:00+02:00'),
    );

    await listener.notify('res-1', { kind: 'expired' });

    expect([...logs.rows.values()]).toEqual([
      expect.objectContaining({ status: 'FAILED', lastError: 'Queue error: Redis down' }),
    ]);
  });
});

describe('EmailDeliveryService', () => {
  const renderer: TemplateRenderer = {
    render: () => ({ subject: 'Temat', html: '<p>x</p>', text: 'x' }),
  };
  const job = (emailLogId: string): EmailJob =>
    ({
      emailLogId,
      template: 'reservation-expired',
      to: 'anna@example.com',
      from: { name: 'Obiekt przez Klucznik', address: 'no-reply@klucznik.local' },
      replyTo: null,
      context: {},
    }) as unknown as EmailJob;

  function setup(mailer: Mailer) {
    const logs = new InMemoryEmailLogs();
    const delivery = new EmailDeliveryService(
      logs,
      renderer,
      mailer,
      FixedClock.at('2026-08-01T10:00:00+02:00'),
    );
    return { logs, delivery };
  }

  it('sends and marks SENT; a retried job after success sends nothing', async () => {
    const sent: MailMessage[] = [];
    const { logs, delivery } = setup({
      send: (message) => {
        sent.push(message);
        return Promise.resolve();
      },
    });
    const id = (await logs.createIfAbsent({ idempotencyKey: 'k' }))!;

    await delivery.deliver(job(id), { number: 1, max: 5 });
    await delivery.deliver(job(id), { number: 2, max: 5 });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'anna@example.com', subject: 'Temat', replyTo: undefined });
    expect(logs.rows.get(id)).toMatchObject({ status: 'SENT', attempts: 1 });
  });

  it('SMTP error → attempts++ and lastError, rethrown for a retry; FAILED after the 5th attempt', async () => {
    const { logs, delivery } = setup({ send: () => Promise.reject(new Error('ECONNREFUSED')) });
    const id = (await logs.createIfAbsent({ idempotencyKey: 'k' }))!;

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(delivery.deliver(job(id), { number: attempt, max: 5 })).rejects.toThrow(
        'ECONNREFUSED',
      );
      expect(logs.rows.get(id)).toMatchObject({ status: 'QUEUED', attempts: attempt });
    }
    await expect(delivery.deliver(job(id), { number: 5, max: 5 })).rejects.toThrow();

    expect(logs.rows.get(id)).toMatchObject({
      status: 'FAILED',
      attempts: 5,
      lastError: 'ECONNREFUSED',
    });
  });
});

describe('startOfDayInZone', () => {
  it.each([
    ['2026-08-01', '2026-07-31T22:00:00.000Z'], // czas letni (UTC+2)
    ['2026-12-01', '2026-11-30T23:00:00.000Z'], // czas zimowy (UTC+1)
    ['2026-03-29', '2026-03-28T23:00:00.000Z'], // dzień zmiany na czas letni
    ['2026-10-25', '2026-10-24T22:00:00.000Z'], // dzień zmiany na czas zimowy
  ])('%s in Europe/Warsaw starts at %s', (date, expected) => {
    expect(startOfDayInZone(CalendarDate.parse(date), 'Europe/Warsaw').toISOString()).toBe(
      expected,
    );
  });
});
