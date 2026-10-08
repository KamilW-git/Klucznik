# Handoff: zgłoszenia między warstwami

> Kolejka próśb, gdy sesja jednej warstwy potrzebuje zmiany w innej (np. UI potrzebuje nowego pola w odpowiedzi API). Czytaj na starcie każdej sesji (krok 3 protokołu): wpisy `OPEN` skierowane do Twojego trybu.
> Zasada: **nie zmieniaj cudzego kodu**. Dopisz wpis, kontynuuj na mocku albo z TODO i zamknij wpis, gdy zmiana jest gotowa.

## Format

| Pole | Opis |
|-|-|
| ID | `H-NNN`, kolejny numer |
| Data | `RRRR-MM-DD` utworzenia |
| Od → Do | tryb zgłaszający → tryb realizujący (`API`, `UI`, `INFRA`, `DOCS`) |
| Co | konkretna zmiana (endpoint, pole, typ, plik) |
| Dlaczego | kontekst i link do dokumentu funkcjonalności lub ekranu |
| Status | `OPEN` → `IN_PROGRESS` → `DONE` (z hashem commita) lub `REJECTED` (z uzasadnieniem) |

Zasady:

- Jeden wpis to jedna zmiana. Większe potrzeby rozbij na kilka wpisów.
- Sesja realizująca zmienia status i dopisuje commit lub uzasadnienie. Wpisów nie usuwamy.
- Zmiana kontraktu API oznacza, że po `DONE` sesja `UI` regeneruje klienta ([packages/api-client/AGENTS.md](../packages/api-client/AGENTS.md)).
- Jeśli zgłoszenie zmienia wymagania lub zachowanie, najpierw aktualizacja dokumentu funkcjonalności (sesja `DOCS` lub realizująca).

## Przykład (nie jest prawdziwym zgłoszeniem)

| ID | Data | Od → Do | Co | Dlaczego | Status |
|-|-|-|-|-|-|
| H-000 | 2026-10-08 | UI → API | Dodać `guest.phone` do `ReservationListItemDto` | Kolumna telefonu w tabeli O4 ([reservations.md](features/reservations.md)) | `REJECTED`: przykład formatu |

## Zgłoszenia

| ID | Data | Od → Do | Co | Dlaczego | Status |
|-|-|-|-|-|-|
| H-001 | 2026-10-08 | API → INFRA | `apps/api/Dockerfile` (multi-stage): build `pnpm --filter @klucznik/api build` (kopiuje `tsconfig.base.json` i `pnpm-workspace.yaml` z roota), runtime `node dist/main.js` z katalogu `apps/api`, tylko zależności produkcyjne (`pnpm deploy --prod` lub odpowiednik). Port 3000, healthcheck `GET /api/v1/health` jak w compose | Zadanie `[INFRA]` M2 w [roadmap.md](roadmap.md#m2-bootstrap-api-api); usługa `api` w compose czeka na Dockerfile | `OPEN` |
| H-002 | 2026-10-08 | API → INFRA | CI `test-api`: usunąć `if: false`; krok `prisma:deploy` usunąć do M3 (skrypt jeszcze nie istnieje); `test:int` korzysta z `TEST_DATABASE_URL` (już w `env`), więc Testcontainers się nie uruchamia. Usługa `redis` niepotrzebna do M9 | `pnpm --filter @klucznik/api test:int` działa od M2 ([testing-strategy.md](architecture/testing-strategy.md)) | `OPEN` |
| H-003 | 2026-10-08 | API → INFRA | CI `contract`: usunąć `if: false`; kroki `api-client generate` i `web typecheck` pominąć do M10 (skrypty nie istnieją). Eksport nie wymaga `.env` ani usług (wartości zastępcze w `src/config/openapi-export-env.ts`) | Pilnowanie aktualności `openapi.json` od M2 ([ADR 0006](decisions/0006-openapi-contract-codegen.md)) | `OPEN` |
| H-004 | 2026-10-08 | API → INFRA | `pnpm-workspace.yaml`: `allowBuilds` z jawną odmową dla `@parcel/watcher`, `@scarf/scarf`, `cpu-features`, `protobufjs`, `ssh2`, `unrs-resolver` | pnpm 11 przerywa `pnpm install` (`ERR_PNPM_IGNORED_BUILDS`), gdy skrypty instalacyjne nie są rozstrzygnięte; żaden z pakietów nie wymaga builda | `DONE`: wykonane w sesji API M2 za zgodą właściciela (wyjątek od podziału trybów) |
