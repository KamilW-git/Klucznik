import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Inject, Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';

import type { RenderedEmail, TemplateRenderer } from '../../common/mail/mailer';
import { type AppConfig, appConfig } from '../../config/app.config';
import { formatDate, formatDateTime, formatMoney, htmlToText, pluralNights } from './helpers';

/** Tematy szablonów (docs/features/notifications.md#szablony); treść w `templates/<nazwa>.hbs`. */
export const EMAIL_SUBJECTS: Record<string, string> = {
  'reservation-received': 'Otrzymaliśmy Twoją prośbę o rezerwację {{reservation.number}}',
  'owner-new-reservation': 'Nowa rezerwacja do potwierdzenia: {{reservation.number}}',
  'reservation-confirmed': 'Twoja rezerwacja {{reservation.number}} została potwierdzona',
  'reservation-cancelled': 'Rezerwacja {{reservation.number}} została anulowana',
  'owner-reservation-cancelled': 'Gość anulował rezerwację {{reservation.number}}',
  'reservation-expired': 'Prośba o rezerwację {{reservation.number}} wygasła',
  'stay-reminder': 'Do zobaczenia za 2 dni w {{property.name}}',
};

const TEMPLATES_DIR = join(__dirname, 'templates');

/**
 * `TEMPLATE_RENDERER` na Handlebars: `templates/<nazwa>.hbs` w `layout.hbs`, helpery `money`, `date`,
 * `dateTime`, `pluralNights`. Szablony kompilowane raz przy starcie; wersja tekstowa z HTML.
 * `strict: true` zamienia brakujące pole kontekstu w błąd zamiast pustego miejsca w e-mailu.
 */
@Injectable()
export class HandlebarsTemplateRenderer implements TemplateRenderer {
  private readonly handlebars = Handlebars.create();
  private readonly layout: Handlebars.TemplateDelegate;
  private readonly templates = new Map<string, Handlebars.TemplateDelegate>();
  private readonly subjects = new Map<string, Handlebars.TemplateDelegate>();

  constructor(@Inject(appConfig.KEY) config: AppConfig) {
    this.handlebars.registerHelper('money', (amount: number, currency: unknown) =>
      formatMoney(amount, typeof currency === 'string' ? currency : 'PLN'),
    );
    this.handlebars.registerHelper('date', (value: string) => formatDate(value));
    this.handlebars.registerHelper('dateTime', (value: string) =>
      formatDateTime(value, config.timeZone),
    );
    this.handlebars.registerHelper('pluralNights', (count: number) => pluralNights(count));
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    this.layout = this.compileFile('layout');
    for (const [name, subject] of Object.entries(EMAIL_SUBJECTS)) {
      this.templates.set(name, this.compileFile(name));
      this.subjects.set(name, this.handlebars.compile(subject, { noEscape: true, strict: true }));
    }
  }

  render(template: string, context: object): RenderedEmail {
    const body = this.templates.get(template);
    const subject = this.subjects.get(template);
    if (!body || !subject) {
      throw new Error(`Unknown e-mail template: ${template}`);
    }
    const html = this.layout({ ...context, body: body(context) });
    return { subject: subject(context), html, text: htmlToText(html) };
  }

  private compileFile(name: string): Handlebars.TemplateDelegate {
    const source = readFileSync(join(TEMPLATES_DIR, `${name}.hbs`), 'utf8');
    return this.handlebars.compile(source, { strict: true });
  }
}
