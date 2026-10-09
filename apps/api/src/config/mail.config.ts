import { registerAs } from '@nestjs/config';

import { parseEnv } from './env.schema';

/** Wysyłka e-maili (apps/api/docs/integrations.md#mail). */
export const mailConfig = registerAs('mail', () => {
  const env = parseEnv(process.env);
  return {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    /** `Klucznik <no-reply@…>` albo sam adres; nazwę nadawcy nadpisuje nazwa obiektu. */
    from: env.MAIL_FROM,
    queueDriver: env.EMAIL_QUEUE_DRIVER,
    /** Adres SPA do linków w e-mailach (`/r/:token`, `/panel/…`, `/o/:slug`). */
    publicUrl: env.APP_PUBLIC_URL.replace(/\/+$/, ''),
  };
});

export type MailConfig = ReturnType<typeof mailConfig>;

/** Redis dla BullMQ (apps/api/docs/integrations.md#kolejki-bullmq). */
export const redisConfig = registerAs('redis', () => {
  const env = parseEnv(process.env);
  return { host: env.REDIS_HOST, port: env.REDIS_PORT };
});

export type RedisConfig = ReturnType<typeof redisConfig>;
