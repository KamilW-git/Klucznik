# Infrastruktura

> Docker Compose, kontenery, zmienne środowiskowe, CI i przyszły deployment. Główny dokument sesji `INFRA` (M1, M14).
> Zasady bezpieczeństwa sekretów: [security.md](security.md#sekrety).

## Struktura plików (tworzy sesja `INFRA`)

```
docker-compose.yml          pełny stack (postgres, redis, mailpit, migrate, api, web)
.dockerignore               kontekst builda bez node_modules, dist, .env i dokumentacji
.env.example                wzór zmiennych (bez prawdziwych sekretów)
apps/api/Dockerfile         multi-stage na node:24-alpine: build → tools (migracje, seed) / prod-deps → runtime (non-root)
apps/web/Dockerfile         multi-stage: build Vite → nginx:alpine
apps/web/nginx.conf         SPA fallback, proxy /api → api:3000, cache statyków, nagłówki
.github/workflows/ci.yml    lint, typecheck, testy, build
package.json, pnpm-workspace.yaml, tsconfig.base.json, eslint.config.mjs, .prettierrc, .editorconfig, .nvmrc
```

## Kontenery

| Usługa | Obraz | Port (host) | Wolumen | Healthcheck |
|-|-|-|-|-|
| `postgres` | `postgres:16-alpine` | 5432 | `pgdata:/var/lib/postgresql/data` | `pg_isready -U $POSTGRES_USER` |
| `redis` | `redis:7-alpine` | 6379 | `redisdata:/data` | `redis-cli ping` |
| `mailpit` | `axllent/mailpit` | 8025 (UI), 1025 (SMTP) | – | `wget -qO- localhost:8025/livez` |
| `migrate` | build `apps/api`, etap `tools` | – | – | – (jednorazowy, kończy się kodem 0) |
| `api` | build `apps/api`, etap `runtime` | 3000 | `uploads:/data/uploads` | `wget -qO- 127.0.0.1:3000/api/v1/health` |
| `web` | build `apps/web` | 8080 | – | `wget -qO- 127.0.0.1/` |

Healthchecki używają `127.0.0.1`, nie `localhost`: przy włączonym IPv6 (np. runnery GitHub Actions) `localhost` rozwiązuje się najpierw do `::1`, a nginx słucha tylko IPv4 (`listen 80`).

- Pełny stack z czystego klonu: `cp .env.example .env` i `docker compose up --build`, aplikacja pod `http://localhost:8080`, Mailpit pod `http://localhost:8025`.
- `migrate` wykonuje `prisma migrate deploy` po starcie `postgres`. `api` czeka na jego zakończenie (`service_completed_successfully`) i na zdrowe `postgres`, `redis`, `mailpit`. Obraz `api` zawiera tylko zależności produkcyjne, a CLI Prismy i `tsx` są w obrazie `tools`.
- `web` czeka na `api`. nginx przekazuje `/api/` do `http://api:3000` z `X-Forwarded-For` (API ma `trust proxy`, więc limity żądań liczą IP klienta), więc aplikacja działa pod jednym originem ([overview.md](overview.md#diagram-komponentów)). nginx serwuje też SPA (fallback na `index.html`), długi cache dla `/assets/*` i nagłówki bezpieczeństwa (CSP `'self'`).
- Seed danych demo uruchamiamy ręcznie po starcie stacku: `docker compose run --rm migrate pnpm prisma:seed`.
- Dev bez kontenerów aplikacji: `docker compose up -d postgres redis mailpit` + `pnpm dev`. Vite proxy przekazuje `/api` do `localhost:3000`.

## Zmienne środowiskowe

Wartości sekretów **nie** trafiają do repo. `.env.example` zawiera klucze z bezpiecznymi wartościami deweloperskimi albo `change-me`. API waliduje zmienne przy starcie ([integrations.md](../../apps/api/docs/integrations.md#konfiguracja)).

Kolumna „Domyślna (dev)” podaje wartości dla `pnpm dev` na hoście (usługi z `docker compose up -d postgres redis mailpit`), więc hosty to `localhost`. Usługa `api` w `docker-compose.yml` nadpisuje `DATABASE_URL`, `REDIS_HOST` i `SMTP_HOST` nazwami usług Compose (`postgres`, `redis`, `mailpit`) ([Q-24](../open-questions.md#q-24)).

| Zmienna | Usługa | Wymagana | Domyślna (dev) | Opis |
|-|-|-|-|-|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | postgres | ✔ | `klucznik` / sekret / `klucznik` | inicjalizacja bazy |
| `POSTGRES_PORT` | postgres | – | `5432` | port na hoście; przy zmianie popraw `DATABASE_URL` ([Q-25](../open-questions.md#q-25)) |
| `NODE_ENV` | api | ✔ | `development` | `development` / `test` / `production` |
| `PORT` | api | – | `3000` | |
| `DATABASE_URL` | api | ✔ | `postgresql://klucznik:…@localhost:5432/klucznik` | w kontenerze `api`: host `postgres` |
| `REDIS_HOST`, `REDIS_PORT` | api | ✔ | `localhost`, `6379` | BullMQ; w kontenerze `api`: host `redis` |
| `JWT_ACCESS_SECRET` | api | ✔ sekret | – | min. 32 znaki |
| `JWT_ACCESS_TTL` | api | – | `900` | sekundy |
| `REFRESH_TOKEN_TTL_DAYS` | api | – | `7` | |
| `COOKIE_SECURE` | api | – | `false` | `true` w produkcji (HTTPS) |
| `CORS_ORIGINS` | api | – | `http://localhost:5173` | lista po przecinku; tylko dev |
| `APP_PUBLIC_URL` | api | ✔ | `http://localhost:8080` | baza linków w e-mailach |
| `APP_TIMEZONE` | api | – | `Europe/Warsaw` | strefa „dziś” i crona |
| `SMTP_HOST`, `SMTP_PORT` | api | ✔ | `localhost`, `1025` | w kontenerze `api`: host `mailpit` |
| `SMTP_USER`, `SMTP_PASSWORD` | api | – sekret | puste | puste w dev |
| `MAIL_FROM` | api | ✔ | `"Klucznik" <no-reply@klucznik.local>` | adres nadawcy; nazwę nadpisuje „{obiekt} przez Klucznik” |
| `EMAIL_QUEUE_DRIVER` | api | – | `bullmq` | `bullmq` (Redis, ponowienia, wskaźnik `redis` w `/health`) albo `inline` (wysyłka od razu, bez Redisa; testy integracyjne) |
| `STORAGE_DRIVER` | api | – | `local` | `local` (MVP), później `s3` |
| `STORAGE_LOCAL_PATH` | api | – | `./uploads` | katalog zdjęć; względny wobec `apps/api` przy `pnpm dev`, w kontenerze `api` nadpisany na `/data/uploads` (wolumen `uploads`) |
| `UPLOAD_MAX_BYTES` | api | – | `10485760` | 10 MB |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | api | – | `60`, `100` | globalny limit |
| `SWAGGER_ENABLED` | api | – | `true` | `/api/docs` |
| `SCHEDULER_ENABLED` | api | – | `true` | `false` w testach i na dodatkowych instancjach |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | api (seed) | ✔ dla seeda, sekret | – | konto admina |
| `SEED_OWNER_PASSWORD` | api (seed) | – sekret | – | hasło kont demo właścicieli |
| `VITE_API_BASE_URL` | web (build) | – | `/api/v1` | |
| `TEST_DATABASE_URL` | testy | – | – | gdy ustawiona, testy integracyjne pomijają Testcontainers |

## CI

`.github/workflows/ci.yml`, uruchamiany dla `push` na `main` i dla każdego PR.

| Job | Kroki |
|-|-|
| `quality` | checkout → pnpm (cache) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm format:check` → `pnpm typecheck` → `pnpm test` (testy jednostkowe wszystkich pakietów) |
| `test-api` | service `postgres:16` → `pnpm --filter @klucznik/api test:int` (z `TEST_DATABASE_URL`, migracje w global-setup testów; kolejka e-maili inline, więc bez Redisa) |
| `test-web` | `pnpm --filter @klucznik/web build` (build produkcyjny Vite); testy Vitest weba biegną w `quality` przez `pnpm test` ([Q-23](../open-questions.md#q-23)) |
| `contract` | `pnpm --filter @klucznik/api openapi:export` → `git diff --exit-code packages/api-client/openapi.json` (kontrakt aktualny) → `pnpm --filter @klucznik/api-client generate` → `git diff --exit-code packages/api-client/src/generated` (klient aktualny) → typecheck web |
| `build` | `pnpm -r build`; na `main` dodatkowo `docker compose up --build --wait` z `.env.example` i smoke test przez nginx (SPA, `/api/v1/health`, fallback trasy), potem `down --volumes` |

Sekrety testowe (np. `JWT_ACCESS_SECRET`) są generowane w workflow (`openssl rand`) albo ustawione w `env:` jako jawne wartości testowe. Nie są to sekrety produkcyjne.

## Konwencje repo (M1)

- `.gitignore`: `node_modules`, `dist`, `coverage`, `.env`, `.env.*` (oprócz `.env.example`), `uploads/`, logi, pliki IDE.
- Node LTS przypięty w `.nvmrc` i `engines`, pnpm przez `packageManager` (Corepack).
- Skrypty root: `dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test` (rekurencyjnie przez `pnpm -r`).
- Opcjonalnie husky + lint-staged + commitlint (Conventional Commits) do decyzji w M1.

## Przyszły deployment (poza MVP)

- Jeden VPS z Docker Compose i reverse proxy z TLS (Caddy lub Traefik), `COOKIE_SECURE=true`.
- Postgres z kopią zapasową (`pg_dump` cron) lub zarządzana baza; Redis bez trwałości krytycznej.
- `STORAGE_DRIVER=s3` (np. S3-compatible) zamiast wolumenu.
- SMTP: dostawca transakcyjny (np. przez SMTP relay), domena z SPF i DKIM.
- Obrazy budowane w CI i publikowane do GHCR; tag `v1.0.0` jako wersja oceniana.
