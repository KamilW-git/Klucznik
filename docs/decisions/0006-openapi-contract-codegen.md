# ADR 0006: Kontrakt OpenAPI w repo i generowany klient (orval)

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** API, UI

## Kontekst

API i UI rozwijają osobne sesje agentów, które nie mogą modyfikować nawzajem swojego kodu. Potrzebny jest jednoznaczny, wersjonowany kontrakt, który wykrywa niezgodności na etapie kompilacji, a nie w runtime. Przedmiot wymaga też dokumentacji REST API (Swagger/OpenAPI).

## Decyzja

- Źródłem prawdy jest **kod API**: dekoratory `@nestjs/swagger` na kontrolerach i DTO.
- Skrypt `pnpm --filter @klucznik/api openapi:export` buduje dokument OpenAPI (bez uruchamiania serwera HTTP) i zapisuje go do **`packages/api-client/openapi.json`**. Plik jest commitowany.
- Skrypt `pnpm --filter @klucznik/api-client generate` uruchamia **orval** i generuje do `packages/api-client/src/generated/` typy, funkcje fetch i hooki TanStack Query.
- Wygenerowany kod używa własnego mutatora `packages/api-client/src/http/mutator.ts`, konfigurowanego przez aplikację (`configureApiClient({ baseUrl, getAccessToken, refresh })`). Pakiet nie zależy od `apps/web`.
- Pliki generowane są commitowane i **nigdy nie są edytowane ręcznie**.
- CI sprawdza aktualność kontraktu (`git diff --exit-code` po eksporcie).

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Ręczne typy na froncie | brak narzędzi | rozjazdy z API, duplikacja |
| Współdzielony pakiet z typami TS (bez OpenAPI) | prostota | wiąże UI z implementacją API; brak dokumentacji dla innych klientów |
| openapi-typescript + ręczne hooki | lżejsze | więcej ręcznego kodu w UI |
| tRPC / GraphQL | silne typowanie end-to-end | odejście od REST wymaganego przez przedmiot |

## Konsekwencje

- **Pozytywne:** zmiana DTO w API daje błąd kompilacji w UI; Swagger zawsze odpowiada kodowi; przyszły `apps/site` użyje tego samego klienta.
- **Negatywne:** jakość typów zależy od jakości dekoratorów Swaggera, więc są one obowiązkowe ([http-layer.md](../../apps/api/docs/http-layer.md#swagger)).
- **Wpływ:** [packages/api-client/AGENTS.md](../../packages/api-client/AGENTS.md), [api-conventions.md](../architecture/api-conventions.md#openapi), [data-and-auth.md](../../apps/web/docs/data-and-auth.md).
