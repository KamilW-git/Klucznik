import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import type { Mailer, MailMessage } from '../../common/mail/mailer';
import { type MailConfig, mailConfig } from '../../config/mail.config';

/** `MAILER` przez SMTP (Mailpit w dev). Uwierzytelnienie tylko, gdy ustawiono `SMTP_USER`. */
@Injectable()
export class NodemailerMailer implements Mailer, OnModuleDestroy {
  private readonly transport: Transporter;

  constructor(@Inject(mailConfig.KEY) config: MailConfig) {
    this.transport = createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      ...(config.smtp.user && {
        auth: { user: config.smtp.user, pass: config.smtp.password },
      }),
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }

  onModuleDestroy(): void {
    this.transport.close();
  }
}
