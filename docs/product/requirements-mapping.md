# Mapowanie wymagań przedmiotu

> Każdy punkt z [course-requirements.md](course-requirements.md) z miejscem realizacji i statusem. Czytaj przed obroną i przy planowaniu etapów.
> Aktualizuj kolumnę „Status” w tym samym commicie, w którym wymaganie zostaje zrealizowane.

Statusy: `PLAN` (zaplanowane w etapie Mx), `WIP` (w trakcie), `DONE` (zrealizowane, z linkiem do dowodu), `N/A`.

## Ocena 3.0

| Wymaganie | Realizacja | Etap | Status |
|-|-|-|-|
| Działająca aplikacja backendowa | NestJS w `apps/api`, health check `GET /api/v1/health` | M2 | PLAN |
| REST API | zasoby w liczbie mnogiej, prefiks `/api/v1`: [api-conventions.md](../architecture/api-conventions.md) | M2–M9 | PLAN |
| Połączenie z bazą danych | PostgreSQL 16 + Prisma (`PrismaService`): [persistence-layer.md](../../apps/api/docs/persistence-layer.md) | M3 | PLAN |
| Min. 3 encje | 12 encji: [data-model.md](../architecture/data-model.md) | M3 | PLAN |
| Min. 1 relacja | m.in. Property 1:N Room, Room 1:N Reservation | M3 | PLAN |
| CRUD dla głównych zasobów | Property, Room, SeasonalRate, AvailabilityBlock, Photo, Reservation: [features/](../features/) | M5–M7 | PLAN |
| Poprawne metody HTTP | GET/POST/PATCH/DELETE + akcje `POST /…/confirm`: [api-conventions.md](../architecture/api-conventions.md) | M2–M9 | PLAN |
| Warstwa obsługi requestów | `modules/*/http`: [http-layer.md](../../apps/api/docs/http-layer.md) | M2+ | PLAN |
| Warstwa logiki biznesowej | `modules/*/application` + `modules/*/domain`: [application-layer.md](../../apps/api/docs/application-layer.md), [domain-layer.md](../../apps/api/docs/domain-layer.md) | M2+ | PLAN |
| Warstwa dostępu do danych | `modules/*/infrastructure` (repozytoria Prisma): [persistence-layer.md](../../apps/api/docs/persistence-layer.md) | M3+ | PLAN |
| DTO oddzielające API od bazy | DTO + mappery w `http/`; encje Prismy nigdy nie wychodzą z API | M2+ | PLAN |
| Walidacja danych wejściowych | globalny `ValidationPipe` + class-validator: [http-layer.md](../../apps/api/docs/http-layer.md) | M2 | PLAN |
| Globalna obsługa błędów | globalny filtr wyjątków, jednolity format błędu: [api-conventions.md](../architecture/api-conventions.md#format-błędu) | M2 | PLAN |
| Min. 1 reguła biznesowa poza CRUD | BR-01 (brak nakładania się rezerwacji) i 12 kolejnych: [business-rules.md](../architecture/business-rules.md) | M7 | PLAN |
| Trwały zapis w bazie | PostgreSQL w wolumenie Dockera | M1, M3 | PLAN |
| Poprawne kody HTTP | 201+Location, 204, 400, 401, 403, 404, 409, 422: [api-conventions.md](../architecture/api-conventions.md) | M2+ | PLAN |

## Ocena 4.0

| Wymaganie | Realizacja | Etap | Status |
|-|-|-|-|
| Authentication | JWT access token + refresh token w ciasteczku httpOnly: [security.md](../architecture/security.md), [auth.md](../features/auth.md) | M4 | PLAN |
| Authorization | `JwtAuthGuard`, `RolesGuard` + polityki własności w `application/` | M4–M5 | PLAN |
| Min. 2 role | `ADMIN`, `OWNER` (+ niezalogowany gość) | M4 | PLAN |
| Ograniczenie dostępu do endpointów | `/admin/**` tylko `ADMIN` (403); zasoby cudzych obiektów 404 (BR-12) | M4–M5 | PLAN |
| Paginacja | `GET /reservations`, `/admin/owners`, `/properties/:id/guests`, `/admin/email-logs` | M4, M7 | PLAN |
| Wyszukiwanie / filtrowanie | `GET /reservations?status=&roomId=&from=&to=&q=`: [reservations.md](../features/reservations.md) | M7 | PLAN |
| Dokumentacja REST API | Swagger UI pod `/api/docs` + `openapi.json` w repo | M2 | PLAN |
| Min. 5 testów jednostkowych logiki | domena: maszyna stanów, cena, walidacja dat, polityka anulowania, nakładanie się zakresów: [testing-strategy.md](../architecture/testing-strategy.md) | M6–M8 | PLAN |
| Min. 3 testy integracyjne REST API | supertest + Testcontainers: login, rezerwacja z kolizją (409), izolacja (404) | M4–M8 | PLAN |
| Migracje schematu | Prisma Migrate + ręczny SQL (EXCLUDE): [persistence-layer.md](../../apps/api/docs/persistence-layer.md) | M3 | PLAN |
| Zarządzanie konfiguracją | `@nestjs/config` z walidacją env przy starcie: [infrastructure.md](../architecture/infrastructure.md) | M2 | PLAN |
| Brak sekretów w repo | `.env` w `.gitignore`, `.env.example` bez wartości sekretów, sekrety CI w GitHub Secrets | M1 | PLAN |
| Logika oddzielona od HTTP | kontrolery bez logiki; `domain/` bez importów NestJS: [overview.md](../architecture/overview.md) | M2+ | PLAN |

## Ocena 5.0

| Wymaganie | Realizacja | Etap | Status |
|-|-|-|-|
| Min. 5 powiązanych encji | User, Property, Room, Guest, Reservation, SeasonalRate, AvailabilityBlock, Photo, … | M3 | PLAN |
| Min. 3 różne reguły biznesowe | BR-01…BR-13 | M5–M8 | PLAN |
| Frontend we frameworku | React + Vite w `apps/web`: [ADR 0003](../decisions/0003-react-vite-spa.md) | M10 | PLAN |
| Frontend komunikuje się z API | klient wygenerowany przez orval + TanStack Query: [data-and-auth.md](../../apps/web/docs/data-and-auth.md) | M10 | PLAN |
| Logowanie i auth na froncie | ekran logowania, access token w pamięci, cichy refresh, ochrona tras | M10 | PLAN |
| Listowanie danych | lista rezerwacji z paginacją (O4), pokoje (O6), właściciele (A1) | M11, M13 | PLAN |
| Dodawanie danych | rezerwacja ręczna (O5), pokój, stawka sezonowa, właściciel | M11, M13 | PLAN |
| Edycja danych | pokój, cennik (O7), ustawienia obiektu (O8), rezerwacja | M11 | PLAN |
| Usuwanie danych | stawka sezonowa, blokada, zdjęcie, pokój (soft delete) | M11 | PLAN |
| Obsługa błędów API | mapowanie `code` → komunikat PL, toasty, alert konfliktu 409: [data-and-auth.md](../../apps/web/docs/data-and-auth.md) | M10–M13 | PLAN |
| Mechanizm asynchroniczny | `@nestjs/event-emitter` (zdarzenia domenowe) + BullMQ/Redis (kolejka e-maili): [async-and-jobs.md](../architecture/async-and-jobs.md) | M9 | PLAN |
| Testy najważniejszej logiki | wszystkie BR mają testy: [business-rules.md](../architecture/business-rules.md) | M5–M9 | PLAN |
| Docker Compose | `docker-compose.yml`: postgres, redis, mailpit, api, web: [infrastructure.md](../architecture/infrastructure.md) | M1, M14 | PLAN |
| Osobne kontenery backend + baza | kontenery `api` i `postgres` (oraz `web`, `redis`, `mailpit`) | M1 | PLAN |
| README umożliwiające uruchomienie | [README.md](../../README.md), sekcja „Uruchomienie” | M14 | PLAN |

### Elementy rozszerzone (wymagany min. 1, realizujemy kilka)

Każdy z nich ma rzeczywiste zastosowanie, a nie tylko zainstalowaną bibliotekę.

| Element | Rzeczywiste zastosowanie | Gdzie | Etap | Status |
|-|-|-|-|-|
| Wysyłanie e-maili | potwierdzenia, anulowania, wygaśnięcia, przypomnienia (nodemailer + Handlebars, Mailpit w dev) | [notifications.md](../features/notifications.md) | M9 | PLAN |
| Scheduler | wygasanie `PENDING` (BR-07), zamykanie pobytów (`COMPLETED`), przypomnienia | [async-and-jobs.md](../architecture/async-and-jobs.md) | M9 | PLAN |
| Upload plików | zdjęcia obiektów i pokoi przez `StorageService` | [photos.md](../features/photos.md) | M5 | PLAN |
| Optimistic locking | edycja rezerwacji z polem `version` (BR-11), alert „Ktoś w międzyczasie zmienił…” | [reservations.md](../features/reservations.md) | M7 | PLAN |
| CI (GitHub Actions) | lint, typecheck, testy z PostgreSQL, build, kontrola aktualności `openapi.json` | [infrastructure.md](../architecture/infrastructure.md#ci) | M1 | PLAN |

## Wymagania formalne

| Wymaganie | Realizacja | Etap | Status |
|-|-|-|-|
| Link do repo + commit/tag końcowy | https://github.com/KamilW-git/Klucznik, tag `v1.0.0` | M14 | PLAN |
| Historia commitów | małe commity w Conventional Commits: [AGENTS.md](../../AGENTS.md#5-zasady-globalne) | ciągle | WIP |
| README: opis projektu | [README.md](../../README.md) | M0 (szkielet), M14 | WIP |
| README: technologie | [README.md](../../README.md) | M0, M14 | WIP |
| README: uruchomienie | [README.md](../../README.md) | M14 | PLAN |
| README: funkcjonalności | [README.md](../../README.md) | M14 | PLAN |
| README: ERD | diagram Mermaid z [data-model.md](../architecture/data-model.md) | M14 | PLAN |
| README: dokumentacja API | link do `/api/docs` + `openapi.json` + tabela endpointów | M14 | PLAN |
| Demo video 3–5 min | scenariusz w [roadmap.md](../roadmap.md) (M14) | M14 | PLAN |

### Zagadnienia na obronę

| Pytanie | Gdzie przygotowane |
|-|-|
| Architektura i struktura projektu | [overview.md](../architecture/overview.md) (diagram komponentów, warstwy) |
| Przepływ requestu od endpointu do bazy | [overview.md](../architecture/overview.md#przepływ-żądania) (diagram sekwencji) |
| Model danych | [data-model.md](../architecture/data-model.md) (ERD) |
| Authentication i authorization | [security.md](../architecture/security.md) |
| Reguła biznesowa | BR-01 od wymagania po constraint w bazie: [business-rules.md](../architecture/business-rules.md#br-01) |
