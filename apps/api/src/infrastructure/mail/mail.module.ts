import { Global, Module } from '@nestjs/common';

import { MAILER, TEMPLATE_RENDERER } from '../../common/mail/mailer';
import { HandlebarsTemplateRenderer } from './handlebars-template-renderer';
import { NodemailerMailer } from './nodemailer.mailer';

/** Wysyłka i renderowanie e-maili (apps/api/docs/integrations.md#mail). Testy podmieniają `MAILER`. */
@Global()
@Module({
  providers: [
    { provide: MAILER, useClass: NodemailerMailer },
    { provide: TEMPLATE_RENDERER, useClass: HandlebarsTemplateRenderer },
  ],
  exports: [MAILER, TEMPLATE_RENDERER],
})
export class MailModule {}
