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
| `TRANSACTION_MANAGER` | `run(fn)` | `ClsTransactionManager` (Prisma + `@nestjs-cls/transactional`) | `common/transactions/`, `infrastructure/prisma/` |
| `EVENT_BUS` | `publish(events)` (czeka na listenery, ich błędy tylko loguje) | `EventEmitterEventBus` | `common/events/`, `infrastructure/events/` (globalny `EventsModule`) |
| `MAILER` | `send({ from, to, subject, html, text, replyTo? })` | `NodemailerMailer` (SMTP) | `common/mail/`, `infrastructure/mail/` (globalny `MailModule`) |
| `TEMPLATE_RENDERER` | `render(template, context) → { subject, html, text }` | `HandlebarsTemplateRenderer` | `common/mail/`, `infrastructure/mail/` |
| `EMAIL_QUEUE` | `enqueue(job)` (`jobId` = `EmailLog.id`) | `BullMqEmailQueue` albo `InlineEmailQueue` (`EMAIL_QUEUE_DRIVER`) | `modules/notifications/application/ports.ts`, `modules/notifications/infrastructure/queue/` |
| `STORAGE` | `put(key, buffer, mime)`, `get(key) → { stream, size }`, `delete(key)` | `LocalDiskStorage` | `common/storage/`, `infrastructure/storage/` (globalny `StorageModule`) |
| `PASSWORD_HASHER` | `hash`, `verify` | `Argon2PasswordHasher` (argon2id) | `common/security/`, `infrastructure/security/` (globalny `SecurityModule`, używany przez `auth` i `users`) |

Moduły domenowe zależą od tokenów, a nie od klas adapterów. Testy podmieniają adaptery fake'ami.

## Prisma

- `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` (`$connect`, `$disconnect`), z driver adapterem `PrismaPg` (wymagany od Prismy 7) i URL z `databaseConfig`. Logi: `warn`, `error`.
- `PrismaModule` (`infrastructure/prisma/`, globalny) eksportuje `PrismaService`, `TRANSACTION_MANAGER` i `DatabaseHealthIndicator`. Konfiguracja CLI, klient i migracje: [persistence-layer.md](persistence-layer.md).

## Mail

- `NodemailerMailer`: transport SMTP z `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; `from` z `MAIL_FROM` (display name nadpisywany nazwą obiektu).
- Szablony: `src/infrastructure/mail/templates/*.hbs` + `layout.hbs` + `partials/`. Build kopiuje je do `dist` (`nest-cli.json` → `assets`).
- Helpery Handlebars: `money` (grosze → „1 640,00 zł”), `date` (`YYYY-MM-DD` → „14.08.2026”), `pluralNights` („1 noc”, „2 noce”, „5 nocy”).
- Każdy szablon ma wersję HTML i tekstową (tekst generowany z HTML albo osobny blok).
- Dev: Mailpit (`http://localhost:8025`). Testy: `FakeMailer` (`test/support/fake-mailer.ts`) zbierający wiadomości w pamięci, podstawiony w `createTestApp`; `failNext(n)` symuluje awarię SMTP.
- Nadawca: `"{obiekt} przez Klucznik" <adres z MAIL_FROM>`, `Reply-To` = `Property.contactEmail` (jeśli ustawiony).
- Szablony są poza Prettierem (`*.hbs` w `.prettierignore`), bo parser glimmer usuwa `<!doctype html>`. Formatuj z katalogu głównego repo, bo tylko tam działa `.prettierignore`.

## Kolejki (BullMQ)

- `@nestjs/bullmq` 12 + `bullmq` 6 + `ioredis` (w BullMQ 6 opcjonalna peer dependency): `BullModule.forRootAsync` (połączenie z `redisConfig`, `maxRetriesPerRequest: null`), `registerQueue({ name: 'emails' })` w `BullEmailQueueModule`. Natywny `msgpackr-extract` ma `allowBuilds: false` (fallback w JS).
- `EmailProcessor extends WorkerHost` (`@Processor('emails', { concurrency: 5 })`): logika w [async-and-jobs.md](../../../docs/architecture/async-and-jobs.md#kolejka-e-maili-bullmq).
- Domyślne opcje jobów: `attempts: 5`, `backoff: exponential 30 s`, `removeOnComplete: true`, `removeOnFail: 1000`.
- Wybór kolejki: `EMAIL_QUEUE_DRIVER` przez `ConditionalModule.registerWhen` (sama podmiana providera nie wystarcza, bo `BullModule` łączy się z Redisem już przy starcie). `inline` w testach integracyjnych: `InlineEmailQueue` wywołuje `EmailDeliveryService` od razu, jedną próbą.
- Health check (`REDIS_HEALTH_INDICATOR`, tylko przy `bullmq`): `PING` przez klienta kolejki z limitem 1 s.

## Scheduler

- `ScheduleModule.forRoot()` w `infrastructure/scheduler/` przez `ConditionalModule` (tylko przy `SCHEDULER_ENABLED=true`). Joby: `modules/reservations/application/reservation-jobs.scheduler.ts` (`@Cron`), logika w `reservation-jobs.service.ts`.
- `@Cron(expr, { name, timeZone: 'Europe/Warsaw' })`: dekorator wylicza się przy imporcie, więc strefa jest stałą równą domyślnemu `APP_TIMEZONE`; „dziś” i „teraz” jobów pochodzą z `Clock`. Job loguje liczbę przetworzonych rekordów i czas.
- Logika w metodach serwisów (testowalna bez crona); job tylko wywołuje serwis z `Clock`.
- Wyłączenie w testach i na dodatkowych instancjach: `SCHEDULER_ENABLED=false`.

## Storage

- `LocalDiskStorage`: katalog `STORAGE_LOCAL_PATH` (`storageConfig`; ścieżka względna liczona od katalogu uruchomienia, przy `pnpm dev` to `apps/api/uploads`; w kontenerze `/data/uploads` na wolumenie `uploads`), klucze płaskie `<uuid>.<ext>`. Katalog powstaje przy pierwszym zapisie.
- `get` zwraca `{ stream, size }` lub rzuca `NotFoundError` (→ 404). Testy integracyjne używają katalogu tymczasowego przebiegu (`global-setup.ts`).
- Walidacja klucza regexem przed dostępem do dysku (ochrona przed path traversal).
- Przyszłość: `S3Storage` z tym samym interfejsem; wybór przez `STORAGE_DRIVER`. `GET /files/:key` może wtedy przekierowywać na pre-signed URL.

## Health check

`GET /api/v1/health` (`@Public`, `@nestjs/terminus`): `database` (`DatabaseHealthIndicator`: `SELECT 1` z limitem 1 s), `redis` (od M9, tylko przy `EMAIL_QUEUE_DRIVER=bullmq`). Zwraca `200 { status: 'ok', info }` lub `503 SERVICE_UNAVAILABLE` w formacie `ErrorResponseDto` z wynikiem terminusa w `details` ([Q-27](../../../docs/open-questions.md#q-27)). Używany przez healthcheck Dockera. Własny wskaźnik zamiast `PrismaHealthIndicator`, bo ten rozpoznaje bazę SQL po treści błędu `$runCommandRaw`.
