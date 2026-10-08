# Roadmapa

> Etapy M0–M14 z zadaniami. Każde zadanie ma tryb sesji (`[API]`, `[UI]`, `[INFRA]`, `[DOCS]`) i link do specyfikacji. Czytaj na starcie każdej sesji (krok 2 protokołu).
> Odhaczaj zadania w tym samym commicie, w którym je realizujesz. Status wymagań przedmiotu: [requirements-mapping.md](product/requirements-mapping.md).

| Etap | Tryb | Zakres | Status |
|-|-|-|-|
| M0 | DOCS | Dokumentacja i wytyczne | gotowe |
| M1 | INFRA | Szkielet monorepo, lint/format, Docker Compose, CI | gotowe |
| M2 | API | Bootstrap API | gotowe (API), Docker i CI: INFRA |
| M3 | API | Schemat Prisma, migracje, seed | – |
| M4 | API | Auth, role, zarządzanie właścicielami | – |
| M5 | API | Obiekty, pokoje, zdjęcia, izolacja | – |
| M6 | API | Cennik, blokady, dostępność, kalendarz | – |
| M7 | API | Rezerwacje: reguły, stany, ręczna, optimistic locking, goście | – |
| M8 | API | Publiczny proces rezerwacji i token gościa | – |
| M9 | API | Zdarzenia, kolejka e-maili, szablony, scheduler | – |
| M10 | UI | Setup frontendu, design system, logowanie | – |
| M11 | UI | Panel Gospodarza | – |
| M12 | UI | Strona publiczna i proces rezerwacji | – |
| M13 | UI | Panel admina | – |
| M14 | DOCS/INFRA | Testy do progów, README, demo, `v1.0.0` | – |

## M0: Dokumentacja

- [x] [DOCS] Root `AGENTS.md`, `docs/product`, `docs/architecture`, `docs/decisions`, `docs/features`, pliki warstw, `design/README.md`
- [ ] [DOCS] Decyzje w [open-questions.md](open-questions.md) (użytkownik)
- [ ] [DOCS] Ekrany Stitch w `design/stitch/` (użytkownik): [design/README.md](../design/README.md)

## M1: Szkielet monorepo [INFRA]

Spec: [infrastructure.md](architecture/infrastructure.md), [ADR 0001](decisions/0001-monorepo-pnpm.md).

- [x] [INFRA] `package.json` (root), `pnpm-workspace.yaml`, `.nvmrc`, `packageManager`, `tsconfig.base.json`
- [x] [INFRA] ESLint (flat config) + Prettier + `.editorconfig`; skrypty `lint`, `format`, `format:check`, `typecheck`, `test`, `build`, `dev`
- [x] [INFRA] `.gitignore` (pełny), `.env.example`
- [x] [INFRA] Puste pakiety `apps/api`, `apps/web`, `packages/api-client` z `package.json` i `tsconfig` (bez logiki)
- [x] [INFRA] `docker-compose.yml`: `postgres`, `redis`, `mailpit` z healthcheckami i wolumenami (`api` i `web` jako szkielety usług w profilu `app`; Dockerfile w M2 i M10)
- [x] [INFRA] `.github/workflows/ci.yml`: job `quality` (pozostałe joby jako szkielet, włączane w kolejnych etapach)
- [x] [INFRA] (opcjonalnie) husky + lint-staged + commitlint: pominięte (decyzja właściciela, 2026-10-08)

## M2: Bootstrap API [API]

Spec: [http-layer.md](../apps/api/docs/http-layer.md), [integrations.md](../apps/api/docs/integrations.md), [api-conventions.md](architecture/api-conventions.md).

- [x] [API] NestJS w `apps/api`, prefiks `/api/v1`, helmet, cookie-parser, request id
- [x] [API] `@nestjs/config` z walidacją env
- [x] [API] Globalny `ValidationPipe` + `AllExceptionsFilter` + `DomainError` + mapa kodów
- [x] [API] Swagger `/api/docs` + skrypt `openapi:export` + `ErrorResponseDto`, `Paginated<T>`, `PaginationQuery`, `SortQuery`
- [x] [API] `Clock` (`SystemClock`, `FixedClock`), `CalendarDate`, `stay-range`, `date-range` + testy (BR-01, BR-04)
- [x] [API] Health check (`/health`, w M2 liveness: [Q-27](open-questions.md#q-27)), Jest + konfiguracja testów integracyjnych (Testcontainers, [Q-26](open-questions.md#q-26))
- [ ] [INFRA] Dockerfile `api`, kontener `api` w compose, joby CI `test-api` i `contract`: [H-001…H-003](handoff.md#zgłoszenia)

## M3: Schemat i migracje [API]

Spec: [data-model.md](architecture/data-model.md), [persistence-layer.md](../apps/api/docs/persistence-layer.md).

- [ ] [API] `schema.prisma` (wszystkie encje), migracja `init`
- [ ] [API] Migracja z ręcznym SQL: `btree_gist`, `EXCLUDE` (BR-01, BR-09), `CHECK`
- [ ] [API] `PrismaService`, `TransactionManager` (CLS), `resetDatabase()` i fabryki testowe
- [ ] [API] Seed danych demo (idempotentny)

## M4: Auth i właściciele [API]

- [ ] [API] Logowanie, refresh z rotacją, wylogowanie, `/auth/me`, guardy, throttling: [auth.md](features/auth.md)
- [ ] [API] `/admin/owners` (CRUD, dezaktywacja), `/admin/properties`: [admin-owners.md](features/admin-owners.md)
- [ ] [API] Testy integracyjne: login, refresh, 403 dla `OWNER` na `/admin`

## M5: Obiekty, pokoje, zdjęcia [API]

- [ ] [API] `OwnershipPolicy`, `AccessScope` (BR-12): [application-layer.md](../apps/api/docs/application-layer.md#polityki-dostępu)
- [ ] [API] Obiekty + slug + dashboard: [properties.md](features/properties.md)
- [ ] [API] Pokoje + BR-10: [rooms.md](features/rooms.md)
- [ ] [API] Zdjęcia, `StorageService`, `/files`: [photos.md](features/photos.md)
- [ ] [API] Testy izolacji (owner B → zasoby A → 404)
- [ ] [INFRA] Wolumen `uploads` w compose

## M6: Cennik i dostępność [API]

- [ ] [API] Stawki sezonowe (BR-09), `calculatePrice`, `resolveMinNights`: [pricing.md](features/pricing.md)
- [ ] [API] Blokady, `AvailabilityService`, `/rooms/:id/quote`, kalendarz: [availability.md](features/availability.md)

## M7: Rezerwacje w panelu [API]

- [ ] [API] Maszyna stanów (BR-06), polityki (BR-02, BR-13), numer rezerwacji: [reservations.md](features/reservations.md)
- [ ] [API] Rezerwacja ręczna w transakcji z `FOR UPDATE` (BR-01), historia `ReservationEvent`
- [ ] [API] Lista z filtrami, wyszukiwaniem, paginacją; szczegóły; `confirm`, `cancel`
- [ ] [API] `PATCH` z optimistic locking (BR-11)
- [ ] [API] Goście: lista, `resolveForReservation`: [guests.md](features/guests.md)
- [ ] [API] Test równoległych rezerwacji (jedna 201, druga 409)

## M8: Proces gościa [API]

- [ ] [API] `/public/properties/:slug`, `availability`, `occupancy`: [guest-booking.md](features/guest-booking.md)
- [ ] [API] Rezerwacja online (`PENDING`, token, `expiresAt`)
- [ ] [API] Podgląd i anulowanie przez token (BR-08)

## M9: Asynchroniczność [API]

- [ ] [API] `EventBus`, zdarzenia domenowe po commicie: [async-and-jobs.md](architecture/async-and-jobs.md)
- [ ] [API] BullMQ `emails`, `EmailProcessor`, `EmailLog`, szablony Handlebars (7): [notifications.md](features/notifications.md)
- [ ] [API] Joby: wygasanie (BR-07), `COMPLETED`, przypomnienia
- [ ] [API] `/admin/email-logs`
- [ ] [INFRA] Redis w CI dla testów kolejki (jeśli potrzebny)

## M10: Setup frontendu [UI]

- [ ] [UI] Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query, Vitest + MSW: [architecture.md](../apps/web/docs/architecture.md)
- [ ] [UI] Konfiguracja orval i mutatora, `generate`: [packages/api-client/AGENTS.md](../packages/api-client/AGENTS.md)
- [ ] [UI] Design system z ekranów Stitch (tokeny, typografia, `StatusBadge`, stany S1): [design-system.md](../apps/web/docs/design-system.md)
- [ ] [UI] Layouty, ochrona tras, `AuthProvider`, interceptor refresh, mapa błędów: [data-and-auth.md](../apps/web/docs/data-and-auth.md)
- [ ] [UI] Ekran logowania O1: [auth.md](features/auth.md)
- [ ] [INFRA] Dockerfile `web` (nginx + proxy `/api`), job CI `test-web`

## M11: Panel Gospodarza [UI]

- [ ] [UI] `OwnerLayout`, przełącznik obiektu, pulpit O2: [properties.md](features/properties.md)
- [ ] [UI] Kalendarz O3 + dialog blokady: [availability.md](features/availability.md)
- [ ] [UI] Rezerwacje O4 (lista, filtry, drawer, akcje, konflikt wersji): [reservations.md](features/reservations.md)
- [ ] [UI] Rezerwacja ręczna O5: [reservations.md](features/reservations.md)
- [ ] [UI] Pokoje O6, edycja pokoju O7 (informacje, zdjęcia, cennik, blokady): [rooms.md](features/rooms.md), [photos.md](features/photos.md), [pricing.md](features/pricing.md)
- [ ] [UI] Ustawienia obiektu O8, goście: [properties.md](features/properties.md), [guests.md](features/guests.md)

## M12: Strona publiczna [UI]

- [ ] [UI] `PublicLayout`, P1–P5: [guest-booking.md](features/guest-booking.md)
- [ ] [UI] Test mobilny 375 px całego procesu

## M13: Panel admina [UI]

- [ ] [UI] `AdminLayout`, A1 właściciele, obiekty, logi e-maili: [admin-owners.md](features/admin-owners.md)

## M14: Finalizacja [DOCS/INFRA]

- [ ] [API] Uzupełnienie testów do progów: [testing-strategy.md](architecture/testing-strategy.md#progi)
- [ ] [INFRA] Pełny stack `docker compose up --build` od zera (świeży klon) + job `build` w CI
- [ ] [DOCS] README: uruchomienie, funkcjonalności, ERD, API, zrzuty ekranów: [README.md](../README.md)
- [ ] [DOCS] `requirements-mapping.md`: wszystkie wiersze `DONE` z dowodami
- [ ] [DOCS] Scenariusz i nagranie demo (3–5 min, poniżej)
- [ ] [DOCS] Tag `v1.0.0` + link do wersji ocenianej w README

### Scenariusz demo (3–5 min)

1. Architektura: monorepo, warstwy, diagram komponentów i przepływu żądania (30 s).
2. Gość na telefonie: strona obiektu → dostępność → rezerwacja → e-mail w Mailpit (60 s).
3. Właściciel: logowanie → pulpit → potwierdzenie → kalendarz → rezerwacja ręczna z kolizją 409 (BR-01) (60 s).
4. Konflikt wersji w dwóch kartach (BR-11) i izolacja danych (drugi właściciel → 404) (30 s).
5. Admin: zakładanie właściciela, logi e-maili (20 s).
6. Swagger, testy w CI, scheduler (wygaszenie `PENDING`) (30 s).
7. Model danych (ERD) i reguła BR-01 od testu do constraintu (30 s).

## Później (poza MVP)

iCal (Booking/Airbnb), płatności i zadatki, samodzielna rejestracja i abonamenty, wielu pracowników obiektu, edytor wyglądu strony, `apps/site` (Next.js, SEO), wielojęzyczność, opinie gości, reset hasła: [vision.md](product/vision.md#później-poza-mvp).
