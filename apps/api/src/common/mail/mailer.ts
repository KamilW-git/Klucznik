export interface MailAddress {
  name: string;
  address: string;
}

export interface MailMessage {
  from: MailAddress;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

/** Port wysyłki e-maili (apps/api/docs/integrations.md#mail). Rzuca błąd, gdy SMTP odrzuci wiadomość. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Renderowanie szablonu e-maila (Handlebars, layout, po polsku). */
export interface TemplateRenderer {
  render(template: string, context: object): RenderedEmail;
}

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');
