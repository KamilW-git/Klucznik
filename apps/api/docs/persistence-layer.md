# Warstwa persystencji (Prisma, migracje, repozytoria, seed)

> Schemat Prisma, migracje (w tym ręczny SQL), repozytoria, soft delete, indeksy i seed. Czytaj w M3 i przy każdej zmianie schematu lub zapytań.
> Model logiczny (encje, pola, constrainty) jest w [data-model.md](../../../docs/architecture/data-model.md). Ten plik opisuje, **jak** go zaimplementować.

## Schemat Prisma

- Plik: `apps/api/prisma/schema.prisma`; `datasource db { provider = "postgresql", url = env("DATABASE_URL") }`.
- Nazewnictwo: model `PascalCase` + `@@map("snake_case_plural")`, pola `camelCase` + `@map("snake_case")`. Enumy `PascalCase` z wartościami `UPPER_SNAKE`.
- Typy: `@db.Uuid` dla id i FK, `@db.Date` dla dat kalendarzowych, `@db.Timestamptz(3)` dla znaczników czasu, `Int` dla kwot.
- `id String @id @default(uuid()) @db.Uuid`, `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)`, `updatedAt DateTime @updatedAt …`.
- Relacje z jawnym `onDelete`: `Restrict` dla danych biznesowych (rezerwacje, goście); `Cascade` dla `RefreshToken`, `ReservationEvent`, `Photo`, `SeasonalRate`, `AvailabilityBlock` przy twardym usunięciu rodzica (w praktyce tylko w testach, bo w aplikacji usuwanie jest miękkie).
- Indeksy i unikalności z [data-model.md](../../../docs/architecture/data-model.md) deklarujemy w Prismie (`@@index`, `@@unique`), o ile się da.

## Migracje

| Krok | Komenda |
|-|-|
| Nowa migracja ze zmian schematu | `pnpm --filter @klucznik/api prisma:migrate --name <opis>` |
| Migracja wymagająca ręcznego SQL | `prisma migrate dev --create-only --name <opis>` → edycja `migration.sql` → `prisma migrate dev` |
| Środowiska (Docker, CI) | `prisma migrate deploy` |

**Ręczny SQL** (Prisma tego nie modeluje), dodawany w migracji `init_constraints` lub osobnych:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations ADD CONSTRAINT reservations_check_dates CHECK (check_out > check_in);
ALTER TABLE reservations ADD CONSTRAINT reservations_check_guests CHECK (guests_count >= 1);
ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out, '[)') WITH &&)
  WHERE (status IN ('PENDING', 'CONFIRMED'));                                  -- BR-01

ALTER TABLE seasonal_rates ADD CONSTRAINT seasonal_rates_check_dates CHECK (date_to >= date_from);
ALTER TABLE seasonal_rates ADD CONSTRAINT seasonal_rates_no_overlap
  EXCLUDE USING gist (room_id WITH =, daterange(date_from, date_to, '[]') WITH &&); -- BR-09

ALTER TABLE availability_blocks ADD CONSTRAINT availability_blocks_check_dates CHECK (date_to >= date_from);
ALTER TABLE rooms ADD CONSTRAINT rooms_check_capacity CHECK (capacity >= 1);
```

- Każdy ręczny fragment ma komentarz z ID reguły. Opisz go też w tym pliku, jeśli dodajesz nowy.
- Nie edytuj migracji już zastosowanych (wypchniętych do repo). Zmiana oznacza nową migrację.
- `prisma migrate dev` może zgłaszać drift dla `EXCLUDE`. W takim wypadku potwierdź brak różnic w modelu i nie generuj migracji usuwającej constraint.

## Repozytoria

- `modules/<f>/infrastructure/prisma-<f>.repository.ts` implementuje port z `application/ports`.
- Zwracają **modele domenowe lub read modele** (typy z `domain/` albo `application/`), mapowane z wyników Prismy wewnątrz repozytorium. Obiekty Prismy nie wychodzą poza `infrastructure/`.
- Przyjmują `AccessScope` dla zasobów panelu ([application-layer.md](application-layer.md#polityki-dostępu)).
- Używają transakcji z kontekstu (`TransactionHost`), nie wstrzykniętego `PrismaService` wprost, gdy operacja może być w transakcji.
- `select` lub `include` jawnie: pobieramy tylko potrzebne pola; listy bez N+1 (`include` albo agregacje `_count`, `groupBy`).

**Tłumaczenie błędów bazy** (w repozytorium, nie w filtrze):

| Błąd | Przykład | Na |
|-|-|-|
| `P2002` (unique) | `users.email`, `properties.slug` | `EmailTakenError`, `SlugTakenError` |
| `23P01` (exclusion, przez `$queryRaw` lub `P2010`/meta) | `reservations_no_overlap` | `ReservationOverlapError` |
| `23P01` | `seasonal_rates_no_overlap` | `SeasonalRateOverlapError` |
| `P2025` (record not found przy update) | update z warunkiem wersji lub statusu | `VersionConflictError` / `InvalidStatusTransitionError` (zależnie od kontekstu) |

**Zapytania specjalne (`$queryRaw` z tagowanym szablonem, nigdy konkatenacja):**

- blokada pokoju: `` SELECT id FROM rooms WHERE id = ${roomId}::uuid FOR UPDATE ``,
- kolizje: `` WHERE room_id = $1 AND status IN ('PENDING','CONFIRMED') AND daterange(check_in, check_out, '[)') && daterange($2, $3, '[)') ``,
- licznik numerów: `INSERT … ON CONFLICT (year) DO UPDATE … RETURNING last_value`,
- zapisy warunkowe (`updateMany` z warunkiem `status`/`version`, sprawdzenie `count`).

## Soft delete

- Dotyczy `Property` i `Room` (`deletedAt`).
- Repozytoria **domyślnie** dodają `deletedAt: null` (helper `notDeleted()`), a historyczne odczyty (rezerwacje z usuniętym pokojem) używają jawnej metody `findByIdIncludingDeleted`.
- Unikalność `slug` dotyczy także usuniętych obiektów (slug nie jest ponownie używany).

## Seed

`prisma/seed.ts` (`pnpm --filter @klucznik/api prisma:seed`), idempotentny (upsert po kluczach naturalnych):

| Dane | Wartości |
|-|-|
| Admin | z `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD` |
| Właściciel | „Jan Nowak”, `jan.nowak@example.com`, hasło z `SEED_OWNER_PASSWORD` |
| Obiekt | „Domki Leśna Polana” (Mazury), slug `lesna-polana` |
| Pokoje | „Domek Sosna” (4 os.), „Domek Brzoza” (6 os.), „Pokój Jeziorny” (2 os.), „Apartament Pod Dębem” (4 os.) |
| Cennik | „Wysoki sezon” 01.07–31.08 (`minNights = 3`), „Majówka”, „Sylwester” |
| Blokada | „Remont” na jednym pokoju |
| Goście i rezerwacje | m.in. „Anna Kowalska”; rezerwacje we wszystkich statusach względem bieżącej daty (`PENDING` wygasające za ~21 h, przyjazdy i wyjazdy „dziś”), część `MANUAL` |
| Drugi właściciel | z jednym obiektem, do demonstracji izolacji (BR-12) |

Dane są spójne z przykładami ze Stitch ([02-prompty-stitch.md](../../../docs/prompts/02-prompty-stitch.md)). Zmienne seeda: [infrastructure.md](../../../docs/architecture/infrastructure.md#zmienne-środowiskowe).

## Testy

- Repozytoria testujemy integracyjnie (prawdziwy PostgreSQL z migracjami), m.in. constrainty `EXCLUDE` i zapisy warunkowe.
- `resetDatabase()` (`TRUNCATE … RESTART IDENTITY CASCADE`) w `beforeEach`.
