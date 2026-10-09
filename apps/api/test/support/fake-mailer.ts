import type { Mailer, MailMessage } from '../../src/common/mail/mailer';

/**
 * `MAILER` testów integracyjnych (apps/api/docs/integrations.md#mail): zbiera wiadomości w pamięci.
 * `failNext(n)` symuluje niedostępny serwer SMTP dla kolejnych `n` wiadomości.
 */
export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  private failures = 0;

  send(message: MailMessage): Promise<void> {
    if (this.failures > 0) {
      this.failures--;
      return Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:1025'));
    }
    this.sent.push(message);
    return Promise.resolve();
  }

  failNext(count = 1): void {
    this.failures = count;
  }

  clear(): void {
    this.sent.length = 0;
    this.failures = 0;
  }

  /** Wiadomości do odbiorcy, w kolejności wysłania. */
  to(recipient: string): MailMessage[] {
    return this.sent.filter((message) => message.to === recipient);
  }

  /** Token z linku `/r/:token` w treści wiadomości. */
  static guestToken(message: MailMessage): string {
    const token = /\/r\/([A-Za-z0-9_-]+)/.exec(message.text)?.[1];
    if (!token) {
      throw new Error(`No guest link in "${message.subject}"`);
    }
    return token;
  }
}
