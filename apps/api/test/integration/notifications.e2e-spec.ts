import request from 'supertest';

import type { Guest, Property, Room, User } from '../../src/infrastructure/prisma/generated/client';
import { ReservationJobsService } from '../../src/modules/reservations/application/reservation-jobs.service';
import type { EmailLogPageDto } from '../../src/modules/notifications/http/email-log.dto';
import type { PublicReservationCreatedDto } from '../../src/modules/public/http/public.dto';
import type { ReservationDto } from '../../src/modules/reservations/http/reservation.dto';
import {
  createAdmin,
  createGuest,
  createOwner,
  createProperty,
  createReservation,
  createRoom,
} from '../factories';
import { accessTokenFor, bearer } from '../support/auth';
import { FakeMailer } from '../support/fake-mailer';
import { resetDatabase } from '../support/reset-database';
import { createTestApp, type TestApp } from './support/create-test-app';

const GUEST_EMAIL = 'anna@example.com';
let lastIp = 0;

// „Dziś” = 2026-08-01 (10:00 w Warszawie).
describe('Notifications and scheduled jobs', () => {
  let ctx: TestApp;
  let owner: User;
  let property: Property;
  let room: Room;
  let guest: Guest;
  let token: string;
  let jobs: ReservationJobsService;
  const http = () => request(ctx.app.getHttpServer());
  const bookOnline = (body: object = {}) =>
    http()
      .post(`/api/v1/public/properties/${property.slug}/reservations`)
      .set('X-Forwarded-For', `10.9.0.${++lastIp}`)
      .send({
        roomId: room.id,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        guestsCount: 2,
        guest: { firstName: 'Anna', lastName: 'Kowalska', email: GUEST_EMAIL, phone: '600100200' },
        ...body,
      })
      .expect(201);
  const reservationIdOf = async (number: string): Promise<string> =>
    (await ctx.prisma.reservation.findUniqueOrThrow({ where: { number } })).id;
  const subjects = (recipient: string): string[] =>
    ctx.mailer.to(recipient).map((message) => message.subject);

  beforeAll(async () => {
    ctx = await createTestApp();
    jobs = ctx.app.get(ReservationJobsService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mailer.clear();
    owner = await createOwner(ctx.prisma, { email: 'owner@example.com' });
    property = await createProperty(ctx.prisma, owner, { name: 'Zielona Zagroda' });
    await ctx.prisma.property.update({
      where: { id: property.id },
      data: { contactEmail: 'kontakt@zagroda.example.com' },
    });
    room = await createRoom(ctx.prisma, property, { name: 'Domek Sosna' });
    guest = await createGuest(ctx.prisma, property, { email: 'gosc@example.com' });
    token = accessTokenFor(ctx.app, owner);
  });

  describe('e-mails after reservation events', () => {
    it('online request → e-mail to the guest (with a working link) and to the owner', async () => {
      const created = (await bookOnline()).body as PublicReservationCreatedDto;

      expect(subjects(GUEST_EMAIL)).toEqual([
        `Otrzymaliśmy Twoją prośbę o rezerwację ${created.number}`,
      ]);
      expect(subjects('owner@example.com')).toEqual([
        `Nowa rezerwacja do potwierdzenia: ${created.number}`,
      ]);
      const [toGuest] = ctx.mailer.to(GUEST_EMAIL);
      expect(toGuest).toMatchObject({
        from: { name: 'Zielona Zagroda przez Klucznik', address: 'test@klucznik.local' },
        replyTo: 'kontakt@zagroda.example.com',
      });
      expect(toGuest?.text).toContain('1 480,00 zł');
      expect(toGuest?.html).toContain('http://localhost:8080/r/');

      const link = FakeMailer.guestToken(toGuest!);
      await http().get(`/api/v1/public/reservations/${link}`).expect(200);

      const logs = await ctx.prisma.emailLog.findMany({ orderBy: { template: 'asc' } });
      expect(logs.map((log) => [log.template, log.status, log.attempts])).toEqual([
        ['owner-new-reservation', 'SENT', 1],
        ['reservation-received', 'SENT', 1],
      ]);
      // Surowy token nie trafia do EmailLog (Q-16, security.md).
      expect(JSON.stringify(logs)).not.toContain(link);
    });

    it('Q-16: confirmation sends a new link; the previous one stops working', async () => {
      const created = (await bookOnline()).body as PublicReservationCreatedDto;
      const firstLink = FakeMailer.guestToken(ctx.mailer.to(GUEST_EMAIL)[0]!);
      const id = await reservationIdOf(created.number);

      await http().post(`/api/v1/reservations/${id}/confirm`).set(bearer(token)).expect(200);

      const confirmation = ctx.mailer.to(GUEST_EMAIL)[1]!;
      expect(confirmation.subject).toBe(`Twoja rezerwacja ${created.number} została potwierdzona`);
      expect(confirmation.text).toContain('Możesz bezpłatnie anulować rezerwację do 07.08.2026');
      const secondLink = FakeMailer.guestToken(confirmation);
      expect(secondLink).not.toBe(firstLink);
      await http().get(`/api/v1/public/reservations/${firstLink}`).expect(404);
      await http().get(`/api/v1/public/reservations/${secondLink}`).expect(200);
    });

    it('guest cancels with the link → e-mails to the guest and to the owner', async () => {
      const created = (await bookOnline()).body as PublicReservationCreatedDto;
      const link = FakeMailer.guestToken(ctx.mailer.to(GUEST_EMAIL)[0]!);

      await http()
        .post(`/api/v1/public/reservations/${link}/cancel`)
        .set('X-Forwarded-For', `10.9.1.${++lastIp}`)
        .send({ reason: 'Zmiana planów' })
        .expect(200);

      expect(subjects(GUEST_EMAIL).at(-1)).toBe(`Rezerwacja ${created.number} została anulowana`);
      expect(subjects('owner@example.com').at(-1)).toBe(
        `Gość anulował rezerwację ${created.number}`,
      );
      expect(ctx.mailer.to('owner@example.com').at(-1)?.text).toContain('Zmiana planów');
    });

    it('owner cancels → e-mail with the reason only to the guest', async () => {
      const reservation = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-20',
        checkOut: '2026-08-22',
      });

      await http()
        .post(`/api/v1/reservations/${reservation.id}/cancel`)
        .set(bearer(token))
        .send({ reason: 'Awaria ogrzewania' })
        .expect(200);

      expect(subjects('gosc@example.com')).toEqual([
        `Rezerwacja ${reservation.number} została anulowana`,
      ]);
      expect(ctx.mailer.to('gosc@example.com')[0]?.text).toContain('Powód: Awaria ogrzewania');
      expect(subjects('owner@example.com')).toEqual([]);
    });

    it('manual reservation: confirmation with a link for a guest with e-mail, nothing without one', async () => {
      const manual = (body: object) =>
        http()
          .post(`/api/v1/properties/${property.id}/reservations`)
          .set(bearer(token))
          .send({ roomId: room.id, guestsCount: 2, ...body })
          .expect(201);

      const withEmail = (
        await manual({
          checkIn: '2026-08-14',
          checkOut: '2026-08-16',
          guest: { firstName: 'Jan', lastName: 'Nowak', email: 'jan@example.com' },
        })
      ).body as ReservationDto;
      await manual({
        checkIn: '2026-08-20',
        checkOut: '2026-08-22',
        guest: { firstName: 'Jan', lastName: 'Bez Maila' },
      });

      expect(subjects('jan@example.com')).toEqual([
        `Twoja rezerwacja ${withEmail.number} została potwierdzona`,
      ]);
      expect(ctx.mailer.sent).toHaveLength(1);
      const link = FakeMailer.guestToken(ctx.mailer.sent[0]!);
      await http().get(`/api/v1/public/reservations/${link}`).expect(200);
    });

    it('SMTP down: the request still succeeds and the EmailLog keeps the error', async () => {
      ctx.mailer.failNext(1);

      await bookOnline();

      const logs = await ctx.prisma.emailLog.findMany({ orderBy: { template: 'asc' } });
      expect(logs.map((log) => [log.template, log.status])).toEqual([
        ['owner-new-reservation', 'SENT'],
        ['reservation-received', 'FAILED'],
      ]);
      expect(logs[1]?.lastError).toContain('ECONNREFUSED');
    });
  });

  describe('scheduled jobs', () => {
    it('BR-07: expirePending → EXPIRED, history, e-mail and a free term; idempotent', async () => {
      const due = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        status: 'PENDING',
      });
      const notYet = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-20',
        checkOut: '2026-08-22',
        status: 'PENDING',
      });
      await ctx.prisma.reservation.update({
        where: { id: due.id },
        data: { expiresAt: new Date('2026-08-01T10:00:00+02:00') }, // == teraz
      });
      await ctx.prisma.reservation.update({
        where: { id: notYet.id },
        data: { expiresAt: new Date('2026-08-01T10:00:01+02:00') },
      });

      await expect(jobs.expirePending(ctx.clock.now())).resolves.toBe(1);
      await expect(jobs.expirePending(ctx.clock.now())).resolves.toBe(0);

      const expired = await ctx.prisma.reservation.findUniqueOrThrow({
        where: { id: due.id },
        include: { events: true },
      });
      expect(expired).toMatchObject({ status: 'EXPIRED', version: 2 });
      expect(expired.events).toMatchObject([{ type: 'EXPIRED', actorType: 'SYSTEM' }]);
      await expect(
        ctx.prisma.reservation.findUniqueOrThrow({ where: { id: notYet.id } }),
      ).resolves.toMatchObject({ status: 'PENDING' });
      expect(subjects('gosc@example.com')).toEqual([`Prośba o rezerwację ${due.number} wygasła`]);
      // Termin jest wolny dla nowej rezerwacji, a spóźnione potwierdzenie → 409.
      await http()
        .post(`/api/v1/properties/${property.id}/reservations`)
        .set(bearer(token))
        .send({
          roomId: room.id,
          checkIn: '2026-08-14',
          checkOut: '2026-08-18',
          guestsCount: 2,
          guest: { id: guest.id },
        })
        .expect(201);
      await http().post(`/api/v1/reservations/${due.id}/confirm`).set(bearer(token)).expect(409);
    });

    it('BR-06: completeStays → COMPLETED only for CONFIRMED with checkOut before today', async () => {
      const finished = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-07-28',
        checkOut: '2026-07-31',
      });
      const leavingToday = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-07-31',
        checkOut: '2026-08-01',
      });
      const pendingPast = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-07-20',
        checkOut: '2026-07-22',
        status: 'PENDING',
      });

      await expect(jobs.completeStays(ctx.clock.today(), ctx.clock.now())).resolves.toBe(1);

      const statuses = await ctx.prisma.reservation.findMany({
        where: { id: { in: [finished.id, leavingToday.id, pendingPast.id] } },
        select: { id: true, status: true },
      });
      expect(Object.fromEntries(statuses.map((r) => [r.id, r.status]))).toEqual({
        [finished.id]: 'COMPLETED',
        [leavingToday.id]: 'CONFIRMED',
        [pendingPast.id]: 'PENDING',
      });
      expect(ctx.mailer.sent).toEqual([]);
    });

    it('Q-09: sendReminders twice → one e-mail 2 days before arrival, only to guests with e-mail', async () => {
      const noEmail = await createGuest(ctx.prisma, property, { email: null });
      const otherRoom = await createRoom(ctx.prisma, property);
      const due = await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-03',
        checkOut: '2026-08-05',
      });
      await createReservation(ctx.prisma, {
        room: otherRoom,
        guest: noEmail,
        checkIn: '2026-08-03',
        checkOut: '2026-08-05',
      });
      await createReservation(ctx.prisma, {
        room: await createRoom(ctx.prisma, property),
        guest,
        checkIn: '2026-08-03',
        checkOut: '2026-08-05',
        status: 'PENDING', // tylko potwierdzone dostają przypomnienie
      });
      await createReservation(ctx.prisma, {
        room,
        guest,
        checkIn: '2026-08-05',
        checkOut: '2026-08-07', // 4 dni przed przyjazdem
      });

      await expect(jobs.sendReminders(ctx.clock.today(), ctx.clock.now())).resolves.toBe(1);
      await expect(jobs.sendReminders(ctx.clock.today(), ctx.clock.now())).resolves.toBe(0);

      expect(subjects('gosc@example.com')).toEqual(['Do zobaczenia za 2 dni w Zielona Zagroda']);
      expect(ctx.mailer.sent).toHaveLength(1);
      await expect(
        ctx.prisma.reservation.findUniqueOrThrow({ where: { id: due.id } }),
      ).resolves.toMatchObject({ reminderSentAt: ctx.clock.now() });
      const link = FakeMailer.guestToken(ctx.mailer.sent[0]!);
      await http().get(`/api/v1/public/reservations/${link}`).expect(200);
    });
  });

  describe('GET /admin/email-logs', () => {
    it('lists logs (newest first) with filters; OWNER → 403', async () => {
      ctx.mailer.failNext(1);
      const created = (await bookOnline()).body as PublicReservationCreatedDto;
      const adminToken = accessTokenFor(ctx.app, await createAdmin(ctx.prisma));
      const list = async (query = ''): Promise<EmailLogPageDto> =>
        (await http().get(`/api/v1/admin/email-logs?${query}`).set(bearer(adminToken)).expect(200))
          .body as EmailLogPageDto;

      const all = await list();
      expect(all.meta.totalItems).toBe(2);
      expect(all.data.map((log) => log.reservationNumber)).toEqual([
        created.number,
        created.number,
      ]);
      expect((await list('status=FAILED')).data).toEqual([
        expect.objectContaining({
          recipient: GUEST_EMAIL,
          template: 'reservation-received',
          attempts: 1,
          lastError: expect.stringContaining('ECONNREFUSED') as unknown,
          sentAt: null,
        }),
      ]);
      expect((await list('q=OWNER@')).data.map((log) => log.template)).toEqual([
        'owner-new-reservation',
      ]);
      expect((await list('from=2026-08-01&to=2026-08-01')).meta.totalItems).toBe(2);
      expect((await list('from=2026-08-02')).meta.totalItems).toBe(0);
      await http().get('/api/v1/admin/email-logs?status=LOST').set(bearer(adminToken)).expect(400);
      await http().get('/api/v1/admin/email-logs').set(bearer(token)).expect(403);
    });
  });
});
