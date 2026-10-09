# packages/api-client: kontrakt API i wygenerowany klient

> Pakiet `@klucznik/api-client` zawiera kontrakt `openapi.json` (generowany z API) i klienta TypeScript (generowany przez orval). **Pliki generowane: nie edytuj ręcznie.**
> Decyzja i uzasadnienie: [ADR 0006](../../docs/decisions/0006-openapi-contract-codegen.md).

## Zawartość

```
packages/api-client/
  openapi.json              kontrakt – generuje sesja API (skrypt eksportu), commitowany
  orval.config.ts           konfiguracja generatora (sesja UI, Q-22)
  src/
    http/mutator.ts         ręcznie pisany fetch (konfigurowalny: baseUrl, token, refresh, błędy → ApiError)
    http/mutator.test.ts    testy mutatora (Vitest): prefiks, błędy, single-flight refresh
    http/api-error.ts       klasa ApiError zgodna z formatem błędu API
    generated/              WYGENEROWANE przez orval: funkcje i hooki per tag, typy w generated/model – nie edytować
    index.ts                publiczny eksport (configureApiClient, refreshAccessToken, ApiError, generated/*)
```

## Kto co zmienia

| Plik | Kto | Jak |
|-|-|-|
| `openapi.json` | sesja `API` | wyłącznie `pnpm --filter @klucznik/api openapi:export` |
| `src/generated/**` | sesja `UI` | wyłącznie `pnpm --filter @klucznik/api-client generate` |
| `src/http/**`, `index.ts` | sesja `UI` | ręcznie (mutator, błędy) |
| `orval.config.ts`, `package.json` | sesja `UI` ([Q-22](../../docs/open-questions.md#q-22)) | ręcznie |

## Przepływ zmiany kontraktu

```mermaid
flowchart LR
  A["Sesja API: zmiana DTO/kontrolera"] --> B["openapi:export → openapi.json"]
  B --> C["commit (kod API + openapi.json)"]
  C --> D["Sesja UI: generate → src/generated"]
  D --> E["tsc pokazuje miejsca do poprawy w apps/web"]
```

1. Sesja `API` zmienia endpoint, uruchamia eksport i commituje `openapi.json` **razem z kodem**. Jeśli zmiana łamie kontrakt używany przez UI, dodaje wpis do [handoff.md](../../docs/handoff.md) dla `UI`.
2. Sesja `UI` regeneruje klienta, poprawia błędy kompilacji w `apps/web` i commituje `src/generated` razem z poprawkami.
3. CI (`contract`) sprawdza, czy `openapi.json` odpowiada kodowi API, czy `src/generated` odpowiada `openapi.json` i czy web kompiluje się z wygenerowanym klientem: [infrastructure.md](../../docs/architecture/infrastructure.md#ci).

## Konfiguracja orval (wytyczne)

- `input`: `./openapi.json`; `output.target`: `./src/generated`, `mode: 'tags-split'` (plik per tag = moduł API), typy w `src/generated/model`.
- `client: 'react-query'`, `httpClient: 'fetch'`, `override.mutator`: `./src/http/mutator.ts` (`customFetch`).
- `override.fetch.includeHttpResponseReturnType: false`: funkcje zwracają samo `data`, a błąd to wyjątek `ApiError` (typ `ErrorType` eksportowany z mutatora, więc `error` w hookach ma typ `ApiError`).
- Domyślny podział orval: `GET` → `useQuery` (z `signal`), pozostałe metody → `useMutation` (zmienne `{ data, ... }`); bez `useInfinite`.
- Nazwy funkcji pochodzą z `operationId` (`Auth_login` → `authLogin`, `useAuthLogin`; `Reservations_confirm` → `useReservationsConfirm`).
- `clean: true`, a po generowaniu Prettier (`hooks.afterAllFilesWrite`).
- `"sideEffects": false` w `package.json`: do bundla trafiają tylko używane endpointy.

## Mutator

| Element | Działanie |
|-|-|
| `configureApiClient({ baseUrl, getAccessToken, refresh, onUnauthorized })` | konfiguracja raz w aplikacji (`apps/web/src/api/client.ts`); `baseUrl` zastępuje prefiks `/api/v1` ścieżek z kontraktu |
| żądanie | `fetch` z `credentials: 'include'` i `Authorization: Bearer` |
| 401 | jedno wspólne odświeżenie (`refreshAccessToken`, single-flight) i jedno ponowienie; nieudane → `onUnauthorized` i `ApiError` 401. Nie dotyczy `/auth/login`, `/auth/refresh`, `/auth/logout` |
| błąd | `ApiError { status, code, message, details, requestId }` z `ErrorResponseDto`; brak sieci → `NETWORK_ERROR` (status 0), odpowiedź spoza formatu → `UNKNOWN_ERROR` |

## Zasady

- Typów z `src/generated` nie rozszerzamy ani nie nadpisujemy w `apps/web`. Gdy czegoś brakuje, poprawiamy dekoratory Swaggera w API (przez handoff).
- Pakiet nie importuje niczego z `apps/*`.
- Wersja pakietu nie jest publikowana do npm; używany przez `workspace:*`.
