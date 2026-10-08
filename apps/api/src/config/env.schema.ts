import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65_535);
const positiveInt = z.coerce.number().int().positive();

const timeZone = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Unknown IANA time zone' },
);

/** Lista originów po przecinku (`CORS_ORIGINS`). Pusta lista = CORS wyłączony. */
const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()));

/**
 * Schemat zmiennych środowiskowych API. Wzór: `.env.example`,
 * opis: docs/architecture/infrastructure.md#zmienne-środowiskowe.
 * Zmienne seeda (`SEED_*`) waliduje skrypt seeda (M3), a `VITE_*` i `POSTGRES_*` nie dotyczą API.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: port.default(3000),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: port,

    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_ACCESS_TTL: positiveInt.default(900),
    REFRESH_TOKEN_TTL_DAYS: positiveInt.default(7),
    COOKIE_SECURE: z.stringbool().default(false),
    CORS_ORIGINS: originList.default([]),

    APP_PUBLIC_URL: z.url(),
    APP_TIMEZONE: timeZone.default('Europe/Warsaw'),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: port,
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    MAIL_FROM: z.string().min(1),

    STORAGE_DRIVER: z.enum(['local']).default('local'),
    STORAGE_LOCAL_PATH: z.string().min(1).default('/data/uploads'),
    UPLOAD_MAX_BYTES: positiveInt.default(10_485_760),

    THROTTLE_TTL: positiveInt.default(60),
    THROTTLE_LIMIT: positiveInt.default(100),

    SWAGGER_ENABLED: z.stringbool().default(true),
    SCHEDULER_ENABLED: z.stringbool().default(true),
  })
  .superRefine((env, ctx) => {
    // NODE_ENV=test pozwala na krótki sekret JWT w testach (integrations.md#konfiguracja).
    if (env.NODE_ENV !== 'test' && env.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'Must be at least 32 characters',
      });
    }
    if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.includes('change-me')) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'Placeholder value from .env.example is not allowed in production',
      });
    }
  });

export type Env = z.output<typeof envSchema>;

export class InvalidEnvError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment variables:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidEnvError';
  }
}

/**
 * Waliduje i typuje zmienne środowiskowe. Puste wartości (`SMTP_USER=`) traktuje jak brak zmiennej,
 * więc działają wartości domyślne, a brak wymaganej zmiennej daje czytelny błąd.
 * Rzuca `InvalidEnvError` z listą wszystkich problemów (aplikacja nie startuje).
 */
export function parseEnv(raw: Record<string, unknown>): Env {
  const nonEmpty = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(nonEmpty);
  if (!result.success) {
    throw new InvalidEnvError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}
