import type { AppConfig } from '../../config/app.config';
import { EMAIL_TEMPLATES } from '../../modules/notifications/domain/email-plan';
import { HandlebarsTemplateRenderer } from './handlebars-template-renderer';
import { formatDate, formatDateTime, formatMoney, htmlToText, pluralNights } from './helpers';

describe('mail helpers', () => {
  it.each([
    [164_000, '1 640,00 zł'],
    [37_050, '370,50 zł'],
    [5, '0,05 zł'],
    [123_456_789, '1 234 567,89 zł'],
    [0, '0,00 zł'],
  ])('formatMoney(%i) → %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });

  it('formatMoney with another currency keeps its code', () => {
    expect(formatMoney(10_000, 'EUR')).toBe('100,00 EUR');
  });

  it('formatDate: YYYY-MM-DD → DD.MM.YYYY', () => {
    expect(formatDate('2026-08-14')).toBe('14.08.2026');
  });

  it('formatDateTime in Europe/Warsaw (summer time)', () => {
    expect(formatDateTime('2026-08-03T08:00:00.000Z', 'Europe/Warsaw')).toBe('03.08.2026, 10:00');
  });

  it.each([
    [1, '1 noc'],
    [2, '2 noce'],
    [4, '4 noce'],
    [5, '5 nocy'],
    [12, '12 nocy'],
    [14, '14 nocy'],
    [22, '22 noce'],
    [25, '25 nocy'],
  ])('pluralNights(%i) → %s', (count, expected) => {
    expect(pluralNights(count)).toBe(expected);
  });

  it('htmlToText keeps link targets and line breaks, decodes entities', () => {
    const text = htmlToText(
      '<p>Dzień dobry &amp; witaj,</p><p><a href="http://x/r/abc">Zarządzaj</a></p><table><tr><td>Numer</td><td>KL-1</td></tr></table>',
    );

    expect(text).toBe('Dzień dobry & witaj,\nZarządzaj (http://x/r/abc)\nNumer KL-1');
  });
});

describe('HandlebarsTemplateRenderer', () => {
  const renderer = new HandlebarsTemplateRenderer({ timeZone: 'Europe/Warsaw' } as AppConfig);
  const context = {
    property: {
      name: 'Domki Leśna Polana',
      slug: 'lesna-polana',
      phone: '+48 600 100 200',
      contactEmail: 'kontakt@example.com',
      street: 'Leśna 12',
      postalCode: '11-730',
      city: 'Mikołajki',
      checkInTime: '15:00',
      checkOutTime: '11:00',
    },
    reservation: {
      number: 'KL-2026-000123',
      checkIn: '2026-08-14',
      checkOut: '2026-08-18',
      nights: 4,
      guestsCount: 3,
      totalPrice: 164_000,
      currency: 'PLN',
      guestNotes: 'Późny przyjazd',
      expiresAt: '2026-08-03T08:00:00.000Z',
      cancellableUntil: '2026-08-07',
      cancelledBy: 'OWNER',
      cancellationReason: 'Remont',
    },
    room: { name: 'Domek Sosna' },
    guest: { firstName: 'Anna', lastName: 'Kowalska', email: 'anna@example.com', phone: null },
    links: {
      manage: 'http://localhost:8080/r/token123',
      panel: 'http://localhost:8080/panel/rezerwacje/1',
      property: 'http://localhost:8080/o/lesna-polana',
    },
  };

  it.each(EMAIL_TEMPLATES)('renders %s with the full context (strict mode)', (template) => {
    const email = renderer.render(template, context);

    expect(email.subject.length).toBeGreaterThan(10);
    expect(email.html).toMatch(/^<!doctype html>/i);
    expect(email.html).toContain('Domki Leśna Polana');
    expect(email.html).toContain('Rezerwacje obsługuje Klucznik');
    expect(email.text).not.toMatch(/<[a-z]/i);
  });

  it('formats money, dates, nights and the deadline in Polish', () => {
    const email = renderer.render('reservation-received', context);

    expect(email.subject).toBe('Otrzymaliśmy Twoją prośbę o rezerwację KL-2026-000123');
    expect(email.text).toContain('1 640,00 zł');
    expect(email.text).toContain('14.08.2026');
    expect(email.text).toContain('4 noce');
    expect(email.text).toContain('03.08.2026, 10:00');
    expect(email.text).toContain('(http://localhost:8080/r/token123)');
  });

  it('shows the owner reason only when the owner cancelled', () => {
    const byOwner = renderer.render('reservation-cancelled', context).text;
    const byGuest = renderer.render('reservation-cancelled', {
      ...context,
      reservation: { ...context.reservation, cancelledBy: 'GUEST' },
    }).text;

    expect(byOwner).toContain('Powód: Remont');
    expect(byGuest).toContain('potwierdzamy anulowanie');
    expect(byGuest).not.toContain('Remont');
  });

  it('fails loudly on a missing context field instead of sending an incomplete e-mail', () => {
    expect(() => renderer.render('stay-reminder', { ...context, room: {} })).toThrow();
  });

  it('rejects an unknown template', () => {
    expect(() => renderer.render('nope', context)).toThrow('Unknown e-mail template');
  });
});
