# Warstwa persystencji (Prisma, migracje, repozytoria, seed)

> Schemat Prisma, migracje (w tym ręczny SQL), repozytoria, soft delete, indeksy i seed. Czytaj w M3 i przy każdej zmianie schematu lub zapytań.
> Model logiczny (encje, pola, constrainty) jest w [data-model.md](../../../docs/architecture/data-model.md). Ten plik opisuje, **jak** go zaimplementować.

## Schemat Prisma

- Plik: `apps/api/prisma/schema.prisma`; `datasource db { provider = "postgresql" }`. W Prismie 7 URL bazy, ścieżki migracji i komenda seeda są w `apps/api/prisma.config.ts` (wczytuje `.env` z `apps/api` albo roota przez `process.loadEnvFile`; bez `DATABASE_URL` działa `prisma generate`).
- Generator `prisma-client` (`moduleFormat = "cjs"`, `importFileExtension = ""`, bo API jest projektem CommonJS: [Q-26](../../../docs/open-questions.md#q-26)) generuje klienta do `src/infrastructure/prisma/generated/`. Katalog **nie** jest commitowany (`apps/api/.gitignore`), generuje go `postinstall` (`prisma generate`); ESLint i Prettier go pomijają.
- Połączenie przez driver adapter `PrismaPg` (wymagany od Prismy 7): `infrastructure/prisma/prisma.service.ts`.
- Daty `@db.Date` Prisma zwraca jako `Date` o północy UTC. Konwersja wyłącznie przez `toDbDate(CalendarDate)` / `fromDbDate(Date)` z `infrastructure/prisma/prisma-dates.ts`.
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

Migracje M3: `…_init` (wygenerowana ze schematu) i `…_init_constraints` (ręczny SQL poniżej). Po dodaniu ręcznego SQL `prisma migrate dev --create-only` daje pustą migrację, czyli brak driftu dla `EXCLUDE` i `CHECK`.

**Ręczny SQL** (Prisma tego nie modeluje), dodawany w migracji `init_constraints` lub osobnych (pełna lista w pliku migracji, m.in. też `CHECK` dla cen ≥ 0 i `min_nights` ≥ 1):

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
- Używają transakcji z kontekstu: wstrzykują `TransactionHost` (typ `PrismaTransactionHost` z `infrastructure/prisma/cls-transaction-manager.ts`) i wołają `this.txHost.tx.<model>`, a nie `PrismaService` wprost, gdy operacja może być w transakcji. Serwisy otwierają transakcję przez port `TRANSACTION_MANAGER` (`run(fn)`).
- `select` lub `include` jawnie: pobieramy tylko potrzebne pola; listy bez N+1 (`include` albo agregacje `_count`, `groupBy`).

**Tłumaczenie błędów bazy** (w repozytorium, nie w filtrze). Prisma 7 z adapterem `pg` daje kod `P2002` tylko dla unique; exclusion i check mają ogólny `P2039`. Dlatego rozpoznajemy błędy po SQLSTATE i nazwie constraintu z `meta.driverAdapterError.cause`: `isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'reservations_no_overlap')` z `infrastructure/prisma/prisma-errors.ts`.

| Błąd (SQLSTATE) | Przykład | Na |
|-|-|-|
| `23505` unique (`P2002`) | `users_email_key`, `properties_slug_key` | `EmailTakenError`, `SlugTakenError` |
| `23P01` exclusion | `reservations_no_overlap` | `ReservationOverlapError` |
| `23P01` exclusion | `seasonal_rates_no_overlap` | `SeasonalRateOverlapError` |
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

`prisma/seed.ts` + `prisma/seed-data.ts` (`pnpm --filter @klucznik/api prisma:seed`, uruchamiany przez `tsx`), w jednej transakcji, idempotentny:

- upsert po kluczach naturalnych: użytkownicy (e-mail), obiekty (slug), pokoje (obiekt + nazwa), goście (obiekt + e-mail albo imię i nazwisko bez e-maila),
- rezerwacje demo (numery `KL-<rok>-000101…000109`, bieżący i poprzedni rok) oraz stawki i blokady pokoi demo są usuwane i tworzone od nowa, bo ich daty liczymy względem „dziś”; aktualizacja w miejscu mogłaby po drodze naruszyć `reservations_no_overlap`,
- `reservation_counters` dla bieżącego roku ustawiany na co najmniej `109`, żeby licznik nie wydał numeru demo,
- stawki sezonowe w najbliższym (bieżącym lub przyszłym) wystąpieniu sezonu, a cena rezerwacji wyliczana noc po nocy (BR-05; w M6 zastąpi to `calculatePrice`),
- `SEED_OWNER_PASSWORD` jest opcjonalna; bez niej konta demo właścicieli dostają hasło admina.

| Dane | Wartości |
|-|-|
| Admin | z `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD` |
| Właściciel | „Jan Nowak”, `jan.nowak@example.com`, hasło z `SEED_OWNER_PASSWORD` |
| Obiekt | „Domki Leśna Polana” (Mazury), slug `lesna-polana` |
| Pokoje | „Domek Sosna” (4 os.), „Domek Brzoza” (6 os.), „Pokój Jeziorny” (2 os.), „Apartament Pod Dębem” (4 os.) |
| Cennik | „Wysoki sezon” 01.07–31.08 (`minNights = 3`), „Majówka”, „Sylwester” |
| Blokada | „Remont” na jednym pokoju |
| Goście i rezerwacje | m.in. „Anna Kowalska”; rezerwacje we wszystkich statusach względem bieżącej daty (`PENDING` wygasające za ~21 h, przyjazdy i wyjazdy „dziś”), część `MANUAL` |
| Drugi właściciel | „Ewa Wiśniewska”, `ewa.wisniewska@example.com`, obiekt „Pensjonat Pod Lipami” (`pod-lipami`) z jednym pokojem i rezerwacją, do demonstracji izolacji (BR-12) |

Dane są spójne z przykładami ze Stitch ([02-prompty-stitch.md](../../../docs/prompts/02-prompty-stitch.md)). Zmienne seeda: [infrastructure.md](../../../docs/architecture/infrastructure.md#zmienne-środowiskowe).

## Testy

- Repozytoria testujemy integracyjnie (prawdziwy PostgreSQL z migracjami: `global-setup.ts` uruchamia `prisma migrate deploy`), m.in. constrainty `EXCLUDE` i zapisy warunkowe. Constrainty bez repozytoriów: `test/integration/database-constraints.e2e-spec.ts`.
- `resetDatabase(prisma)` (`test/support/reset-database.ts`, `TRUNCATE … RESTART IDENTITY CASCADE` wszystkich tabel poza `_prisma_migrations`) w `beforeEach`.
- Fabryki (`test/factories/index.ts`): `createOwner`, `createAdmin`, `createProperty`, `createRoom`, `createGuest`, `createReservation`, `createSeasonalRate`, `createBlock`. Hasło testowe `TEST_PASSWORD` hashowane raz na przebieg.
