# Mapowanie wymagań przedmiotu

> Każdy punkt z [course-requirements.md](course-requirements.md) z miejscem realizacji, dowodem i statusem. Czytaj przed obroną i przy planowaniu etapów.
> Aktualizuj kolumnę „Status” w tym samym commicie, w którym wymaganie zostaje zrealizowane.

Statusy: `PLAN` (zaplanowane w etapie Mx), `WIP` (w trakcie), `DONE` (zrealizowane, z linkiem do dowodu), `N/A`.
Stan na M14 (2026-11-06). Ścieżki kodu są względne wobec roota repo, testy integracyjne leżą w [`apps/api/test/integration/`](../../apps/api/test/integration/).

## Ocena 3.0

| Wymaganie | Realizacja i dowód | Etap | Status |
|-|-|-|-|
| Działająca aplikacja backendowa | NestJS w `apps/api`, `GET /api/v1/health` (baza i Redis); kontener `api` w [docker-compose.yml](../../docker-compose.yml), smoke test w CI (job `build`) | M2, M14 | DONE |
| REST API | 49 endpointów pod `/api/v1`, zasoby w liczbie mnogiej: [api-conventions.md](../architecture/api-conventions.md), tabela w [README](../../README.md#dokumentacja-rest-api) | M2–M9 | DONE |
| Połączenie z bazą danych | PostgreSQL 16 + Prisma 7 z adapterem `pg` (`PrismaService`): [persistence-layer.md](../../apps/api/docs/persistence-layer.md); test `health.e2e-spec.ts` | M3 | DONE |
| Min. 3 encje | 12 modeli w [schema.prisma](../../apps/api/prisma/schema.prisma): [data-model.md](../architecture/data-model.md) | M3 | DONE |
| Min. 1 relacja | m.in. User 1:N Property, Property 1:N Room, Room 1:N Reservation, Guest 1:N Reservation: [ERD](../architecture/data-model.md#erd) | M3 | DONE |
| CRUD dla głównych zasobów | Property, Room, SeasonalRate, AvailabilityBlock, Photo, Reservation, owner (admin): [features/](../features/); testy `properties`, `rooms`, `rates`, `blocks`, `photos`, `reservations`, `admin-owners` `.e2e-spec.ts` | M5–M7 | DONE |
| Poprawne metody HTTP | `GET`/`POST`/`PATCH`/`DELETE` + akcje `POST /reservations/:id/confirm`, `…/cancel`: [api-conventions.md](../architecture/api-conventions.md#metody-i-kody-odpowiedzi) | M2–M9 | DONE |
| Warstwa obsługi requestów | `apps/api/src/modules/*/http` (kontrolery, DTO, mappery): [http-layer.md](../../apps/api/docs/http-layer.md) | M2+ | DONE |
| Warstwa logiki biznesowej | `modules/*/application` (serwisy, polityki) + `modules/*/domain` (czyste reguły): [application-layer.md](../../apps/api/docs/application-layer.md), [domain-layer.md](../../apps/api/docs/domain-layer.md) | M2+ | DONE |
| Warstwa dostępu do danych | `modules/*/infrastructure/prisma-*.repository.ts` za portami z `application/ports`: [persistence-layer.md](../../apps/api/docs/persistence-layer.md) | M3+ | DONE |
| DTO oddzielające API od bazy | DTO + mappery w `http/` (np. [public.dto.ts](../../apps/api/src/modules/public/http/public.dto.ts)); encje Prismy nie wychodzą z kontrolerów | M2+ | DONE |
| Walidacja danych wejściowych | globalny `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) + class-validator; test `error-format.e2e-spec.ts` (400 `VALIDATION_ERROR` z polami) | M2 | DONE |
| Globalna obsługa błędów | `AllExceptionsFilter` + `DomainError` + mapa kodów ([error-http-map.ts](../../apps/api/src/common/errors/error-http-map.ts)), jeden format: [api-conventions.md](../architecture/api-conventions.md#format-błędu) | M2 | DONE |
| Min. 1 reguła biznesowa poza CRUD | BR-01 (rezerwacje się nie nakładają: domena + transakcja z `FOR UPDATE` + `EXCLUDE` w bazie) i 12 kolejnych: [business-rules.md](../architecture/business-rules.md) | M7 | DONE |
| Trwały zapis w bazie | PostgreSQL w wolumenie `pgdata`, zdjęcia w wolumenie `uploads` ([docker-compose.yml](../../docker-compose.yml)) | M1, M3 | DONE |
| Poprawne kody HTTP | 201 + `Location`, 204, 400, 401, 403, 404, 409, 413, 415, 422, 429, 503: [api-conventions.md](../architecture/api-conventions.md#metody-i-kody-odpowiedzi); testy integracyjne sprawdzają kody i `code` | M2+ | DONE |

## Ocena 4.0

| Wymaganie | Realizacja i dowód | Etap | Status |
|-|-|-|-|
| Authentication | JWT access token (15 min) + refresh token z rotacją w ciasteczku `httpOnly`: [security.md](../architecture/security.md), [auth.md](../features/auth.md); test `auth.e2e-spec.ts` (login, rotacja, ponowne użycie → unieważnienie) | M4 | DONE |
| Authorization | globalne `JwtAuthGuard` + `RolesGuard` (fail-closed), `OwnershipPolicy` w `application/`: [ADR 0008](../decisions/0008-multi-tenancy-ownership.md); testy `authorization.e2e-spec.ts`, `isolation.e2e-spec.ts`, `roles.guard.spec.ts` | M4–M5 | DONE |
| Min. 2 role | `ADMIN`, `OWNER` (+ niezalogowany gość z tokenem rezerwacji) | M4 | DONE |
| Ograniczenie dostępu do endpointów | `/admin/**` tylko `ADMIN` (403), zasób innego właściciela → 404 (BR-12) | M4–M5 | DONE |
| Paginacja | `GET /reservations`, `/admin/owners`, `/admin/properties`, `/admin/email-logs`, `/properties/:id/guests` (`{ data, meta }`): [api-conventions.md](../architecture/api-conventions.md#paginacja) | M4, M7 | DONE |
| Wyszukiwanie / filtrowanie | `GET /reservations?status=&roomId=&source=&from=&to=&q=&sort=`: [reservations.md](../features/reservations.md); wyszukiwanie `q` także w właścicielach i gościach | M7 | DONE |
| Dokumentacja REST API | Swagger UI `/api/docs`, kontrakt [openapi.json](../../packages/api-client/openapi.json) w repo, aktualność pilnowana w CI (job `contract`) | M2 | DONE |
| Min. 5 testów jednostkowych logiki | 262 przypadki w 24 plikach, każda reguła BR ma test jednostkowy: [testing-strategy.md](../architecture/testing-strategy.md#stan-m14-2026-11-06) | M6–M8, M14 | DONE |
| Min. 3 testy integracyjne REST API | 262 przypadki w 19 plikach (supertest + PostgreSQL), m.in. login, kolizja 409 (BR-01), izolacja 404 (BR-12) | M4–M9 | DONE |
| Migracje schematu | Prisma Migrate z ręcznym SQL (`btree_gist`, `EXCLUDE`, `CHECK`) w [prisma/migrations](../../apps/api/prisma/migrations/); w Dockerze usługa `migrate` | M3 | DONE |
| Zarządzanie konfiguracją | `@nestjs/config` + schemat zod walidowany przy starcie ([env.schema.ts](../../apps/api/src/config/env.schema.ts)): [infrastructure.md](../architecture/infrastructure.md#zmienne-środowiskowe) | M2 | DONE |
| Brak sekretów w repo | `.env` w `.gitignore` i `.dockerignore`, [.env.example](../../.env.example) z wartościami `change-me`; produkcja odrzuca wartości zastępcze; CI używa jawnych wartości testowych w `env:` | M1 | DONE |
| Logika oddzielona od HTTP | kontrolery wołają jeden serwis i mapują DTO; `domain/` bez importów NestJS i Prismy: [overview.md](../architecture/overview.md) | M2+ | DONE |

## Ocena 5.0

| Wymaganie | Realizacja i dowód | Etap | Status |
|-|-|-|-|
| Min. 5 powiązanych encji | User, Property, Room, Guest, Reservation, SeasonalRate, AvailabilityBlock, Photo, ReservationEvent, EmailLog, RefreshToken, ReservationCounter: [ERD](../architecture/data-model.md#erd) | M3 | DONE |
| Min. 3 różne reguły biznesowe | BR-01…BR-13 (nakładanie, pojemność, min. noce, daty, cena, maszyna stanów, wygasanie, anulowanie, stawki, soft delete, optimistic locking, izolacja, rezerwowalność): [business-rules.md](../architecture/business-rules.md) | M5–M9 | DONE |
| Frontend we frameworku | React 19 + Vite w `apps/web`: [ADR 0003](../decisions/0003-react-vite-spa.md) | M10 | DONE |
| Frontend komunikuje się z API | klient i hooki TanStack Query generowane przez orval z `openapi.json`: [data-and-auth.md](../../apps/web/docs/data-and-auth.md) | M10 | DONE |
| Logowanie i auth na froncie | ekran logowania (O1), access token w pamięci, cichy refresh, ochrona tras według roli: [login-page.tsx](../../apps/web/src/features/auth/pages/login-page.tsx) | M10 | DONE |
| Listowanie danych | rezerwacje z filtrami i paginacją (O4), pokoje (O6), goście, właściciele, obiekty, logi e-maili (A1) | M11, M13 | DONE |
| Dodawanie danych | rezerwacja ręczna ([manual-reservation-dialog.tsx](../../apps/web/src/features/reservations/components/manual-reservation-dialog.tsx)), pokój, stawka, blokada, zdjęcie, właściciel, rezerwacja online gościa | M11–M13 | DONE |
| Edycja danych | rezerwacja (z `version`), pokój, stawka, ustawienia obiektu, właściciel | M11, M13 | DONE |
| Usuwanie danych | pokój (soft delete, [delete-room-dialog.tsx](../../apps/web/src/features/rooms/components/delete-room-dialog.tsx)), stawka, blokada, zdjęcie, blokada konta właściciela | M11, M13 | DONE |
| Obsługa błędów API | mapowanie `code` → komunikat PL ([api-errors.ts](../../apps/web/src/shared/lib/api-errors.ts)), błędy pól z `VALIDATION_ERROR`, alert konfliktu wersji 409: [data-and-auth.md](../../apps/web/docs/data-and-auth.md) | M10–M13 | DONE |
| Mechanizm asynchroniczny | zdarzenia domenowe po commicie (`@nestjs/event-emitter`) + kolejka BullMQ/Redis z ponowieniami dla e-maili: [async-and-jobs.md](../architecture/async-and-jobs.md); test `notifications.e2e-spec.ts` | M9 | DONE |
| Testy najważniejszej logiki | każda reguła BR ma testy jednostkowe i integracyjne z ID w nazwie: [business-rules.md](../architecture/business-rules.md) | M5–M9, M14 | DONE |
| Docker Compose | `docker compose up --build` z czystego klonu: postgres, redis, mailpit, migrate, api, web; sprawdzane w CI: [infrastructure.md](../architecture/infrastructure.md#kontenery) | M1, M14 | DONE |
| Osobne kontenery backend + baza | `api` ([Dockerfile](../../apps/api/Dockerfile)) i `postgres` (oraz `web` z nginx, `redis`, `mailpit`) | M14 | DONE |
| README umożliwiające uruchomienie | [README.md](../../README.md#uruchomienie): instrukcja sprawdzona na czystym klonie | M14 | DONE |

### Elementy rozszerzone (wymagany min. 1, realizujemy kilka)

Każdy z nich ma rzeczywiste zastosowanie, a nie tylko zainstalowaną bibliotekę.

| Element | Rzeczywiste zastosowanie | Gdzie | Etap | Status |
|-|-|-|-|-|
| Wysyłanie e-maili | 7 szablonów: prośba o rezerwację, potwierdzenie, anulowanie, wygaśnięcie, przypomnienie i powiadomienia właściciela (nodemailer + Handlebars, Mailpit w dev), log w `EmailLog` | [notifications.md](../features/notifications.md) | M9 | DONE |
| Scheduler | wygasanie `PENDING` (BR-07), zamykanie pobytów (`COMPLETED`), przypomnienia przed przyjazdem | [async-and-jobs.md](../architecture/async-and-jobs.md#scheduler) | M9 | DONE |
| Upload plików | zdjęcia obiektów i pokoi (`StorageService`, sprawdzanie sygnatury pliku, limit 10 MB, wolumen `uploads`) | [photos.md](../features/photos.md) | M5 | DONE |
| Optimistic locking | edycja rezerwacji z polem `version` (BR-11), alert „Ktoś w międzyczasie zmienił tę rezerwację” | [reservations.md](../features/reservations.md) | M7 | DONE |
| CI (GitHub Actions) | lint, format, typecheck, testy jednostkowe, testy integracyjne z PostgreSQL, kontrola kontraktu i klienta, build i smoke test pełnego stacku Docker | [ci.yml](../../.github/workflows/ci.yml), [infrastructure.md](../architecture/infrastructure.md#ci) | M1, M14 | DONE |

## Wymagania formalne

| Wymaganie | Realizacja | Etap | Status |
|-|-|-|-|
| Link do repo + commit/tag końcowy | https://github.com/KamilW-git/Klucznik, tag `v1.0.0` (po nagraniu demo) | M14 | WIP |
| Historia commitów | małe commity w Conventional Commits: [AGENTS.md](../../AGENTS.md#5-zasady-globalne) | ciągle | DONE |
| README: opis projektu | [README.md](../../README.md#opis-projektu) | M14 | DONE |
| README: technologie | [README.md](../../README.md#technologie) | M14 | DONE |
| README: uruchomienie | [README.md](../../README.md#uruchomienie) | M14 | DONE |
| README: funkcjonalności | [README.md](../../README.md#główne-funkcjonalności) (ze zrzutami ekranu) | M14 | DONE |
| README: ERD | diagram Mermaid w [README.md](../../README.md#model-danych-erd), pełny model w [data-model.md](../architecture/data-model.md#erd) | M14 | DONE |
| README: dokumentacja API | tabela endpointów, Swagger `/api/docs`, `openapi.json`: [README.md](../../README.md#dokumentacja-rest-api) | M14 | DONE |
| Demo video 3–5 min | scenariusz: [demo.md](../demo.md); nagranie: link w README | M14 | WIP |

### Zagadnienia na obronę

| Pytanie | Gdzie przygotowane |
|-|-|
| Architektura i struktura projektu | [overview.md](../architecture/overview.md) (diagram komponentów, warstwy) |
| Przepływ requestu od endpointu do bazy | [overview.md](../architecture/overview.md#przepływ-żądania) (diagram sekwencji) |
| Model danych | [data-model.md](../architecture/data-model.md) (ERD) |
| Authentication i authorization | [security.md](../architecture/security.md) |
| Reguła biznesowa | BR-01 od wymagania po constraint w bazie: [business-rules.md](../architecture/business-rules.md#br-01) |

Omówienie każdego zagadnienia w punktach: [demo.md](../demo.md#zagadnienia-do-omówienia).
