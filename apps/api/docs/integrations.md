# Integracje: konfiguracja, mail, kolejki, scheduler, storage

> Porty i adaptery modułów technicznych w `src/config` i `src/infrastructure`. Czytaj w M2 (konfiguracja), M5 (storage) i M9 (mail, kolejki, scheduler).
> Architektura asynchroniczna: [async-and-jobs.md](../../../docs/architecture/async-and-jobs.md). Zmienne środowiskowe: [infrastructure.md](../../../docs/architecture/infrastructure.md#zmienne-środowiskowe).

## Konfiguracja

- `@nestjs/config` z `validate: parseEnv` (schemat **zod 4**) w `src/config/env.schema.ts`. Błędna lub brakująca zmienna oznacza, że aplikacja nie startuje i wypisuje listę wszystkich błędów (`InvalidEnvError`). Pusta wartość (`SMTP_USER=`) liczy się jak brak zmiennej, więc działa wartość domyślna.
- Schemat obejmuje zmienne API z `.env.example`. `SEED_*` waliduje skrypt seeda, a `POSTGRES_*` i `VITE_*` nie dotyczą API.
- Plik `.env`: `apps/api/.env` albo `.env` w roocie monorepo (`AppConfigModule` w `src/config/config.module.ts`). Zmienne procesu (Docker, CI) mają pierwszeństwo. Przy `NODE_ENV=test` plik jest pomijany, a wartości testów integracyjnych ustawia `test/integration/setup/test-env.ts`.
- Typowana konfiguracja przez `registerAs` (`appConfig` od M2; `authConfig`, `mailConfig`, `storageConfig`, `redisConfig` w etapach, które ich używają) i wstrzykiwanie `ConfigType<typeof authConfig>`. Nie używaj `process.env` poza `src/config/`.
- `NODE_ENV=test` pozwala na wartości testowe (np. krótki sekret JWT w testach). `NODE_ENV=production` odrzuca sekret JWT z `.env.example` (`change-me…`).

## Porty techniczne

| Port (token DI) | Interfejs | Adapter MVP | Gdzie |
|-|-|-|-|
| `CLOCK` | `now()`, `today()` | `SystemClock` | `common/domain/clock.ts`, `infrastructure/clock/` |
| `TransactionManager` | `run(fn)` | Prisma + CLS | `infrastructure/prisma/` |
| `EVENT_BUS` | `publish(event)` | `EventEmitter2` | `infrastructure/events/` |
| `MAILER` | `send({ to, subject, html, text, replyTo? })` | `NodemailerMailer` (SMTP) | `infrastructure/mail/` |
| `TEMPLATE_RENDERER` | `render(template, context) → { subject, html, text }` | Handlebars | `infrastructure/mail/` |
| `EMAIL_QUEUE` | `enqueue(job, { jobId })` | BullMQ `Queue('emails')` | `infrastructure/queue/` |
| `STORAGE` | `put(key, buffer, mime)`, `get(key) → stream`, `delete(key)` | `LocalDiskStorage` | `infrastructure/storage/` |
| `PASSWORD_HASHER` | `hash`, `verify` | argon2 | `modules/auth/infrastructure/` |

Moduły domenowe zależą od tokenów, a nie od klas adapterów. Testy podmieniają adaptery fake'ami.

## Prisma

- `PrismaService extends PrismaClient implements OnModuleInit` (`$connect`), z `enableShutdownHooks`.
- Logowanie zapytań tylko w dev (`log: ['warn', 'error']`, a opcjonalnie `query` przez env).

## Mail

- `NodemailerMailer`: transport SMTP z `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; `from` z `MAIL_FROM` (display name nadpisywany nazwą obiektu).
- Szablony: `src/infrastructure/mail/templates/*.hbs` + `layout.hbs` + `partials/`. Build kopiuje je do `dist` (`nest-cli.json` → `assets`).
- Helpery Handlebars: `money` (grosze → „1 640,00 zł”), `date` (`YYYY-MM-DD` → „14.08.2026”), `pluralNights` („1 noc”, „2 noce”, „5 nocy”).
- Każdy szablon ma wersję HTML i tekstową (tekst generowany z HTML albo osobny blok).
- Dev: Mailpit (`http://localhost:8025`). Testy: `FakeMailer` zbierający wiadomości w pamięci.

## Kolejki (BullMQ)

- `@nestjs/bullmq`: `BullModule.forRootAsync` (połączenie z `REDIS_HOST` i `REDIS_PORT`), `registerQueue({ name: 'emails' })`.
- `EmailProcessor extends WorkerHost` (`@Processor('emails', { concurrency: 5 })`): logika w [async-and-jobs.md](../../../docs/architecture/async-and-jobs.md#kolejka-e-maili-bullmq).
- Domyślne opcje jobów: `attempts: 5`, `backoff: exponential 30 s`, `removeOnComplete: true`, `removeOnFail: 1000`.
- Testy integracyjne bez Redisa: `EMAIL_QUEUE` podmieniony na `InlineEmailQueue` (wywołuje processor synchronicznie).
- Health check sprawdza połączenie z Redisem.

## Scheduler

- `ScheduleModule.forRoot()` w `infrastructure/scheduler/`. Klasy jobów w modułach (`modules/reservations/application/jobs/*.job.ts`).
- `@Cron(expr, { name, timeZone: APP_TIMEZONE })`. Job loguje start, liczbę przetworzonych rekordów i czas.
- Logika w metodach serwisów (testowalna bez crona); job tylko wywołuje serwis z `Clock`.
- Wyłączenie w testach i na dodatkowych instancjach: `SCHEDULER_ENABLED=false`.

## Storage

- `LocalDiskStorage`: katalog `STORAGE_LOCAL_PATH` (wolumen Dockera `uploads`), klucze płaskie `<uuid>.<ext>`.
- `get` zwraca `{ stream, size }` lub rzuca `FileNotFoundError` (→ 404).
- Walidacja klucza regexem przed dostępem do dysku (ochrona przed path traversal).
- Przyszłość: `S3Storage` z tym samym interfejsem; wybór przez `STORAGE_DRIVER`. `GET /files/:key` może wtedy przekierowywać na pre-signed URL.

## Health check

`GET /api/v1/health` (`@Public`, `@nestjs/terminus`): `database` (Prisma ping, od M3), `redis` (od M9). Zwraca `200 { status: 'ok', info }` lub `503 SERVICE_UNAVAILABLE` w formacie `ErrorResponseDto` z wynikiem terminusa w `details` (od M3). Używany przez healthcheck Dockera. W M2 to sam liveness bez wskaźników ([Q-27](../../../docs/open-questions.md#q-27)).
