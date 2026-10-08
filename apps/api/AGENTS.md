# apps/api: wytyczne dla sesji `API`

> Punkt wejścia sesji w trybie `API` (NestJS + Prisma + PostgreSQL). Czytaj po root [AGENTS.md](../../AGENTS.md).
> Zawiera zasady i linki. Szczegóły warstw są w [docs/](docs/).

## Obowiązkowa lektura

1. [business-rules.md](../../docs/architecture/business-rules.md) i [api-conventions.md](../../docs/architecture/api-conventions.md),
2. dokument realizowanej funkcjonalności w [docs/features/](../../docs/features/),
3. dokumenty warstw, których dotyczy zadanie:

| Dokument | Kiedy |
|-|-|
| [docs/http-layer.md](docs/http-layer.md) | kontrolery, DTO, walidacja, Swagger, guardy, mapowanie błędów |
| [docs/application-layer.md](docs/application-layer.md) | serwisy przypadków użycia, polityki dostępu, transakcje, zdarzenia |
| [docs/domain-layer.md](docs/domain-layer.md) | reguły, maszyna stanów, błędy domenowe, `Clock`, testy jednostkowe |
| [docs/persistence-layer.md](docs/persistence-layer.md) | schemat Prisma, migracje (ręczny SQL), repozytoria, seed |
| [docs/integrations.md](docs/integrations.md) | konfiguracja, mail, kolejki, scheduler, storage |

## Struktura

```
apps/api/
  prisma/              schema.prisma, migrations/, seed.ts
  src/
    main.ts, app.module.ts
    config/            schemat i typowana konfiguracja env
    common/            filtr wyjątków, guardy, dekoratory, paginacja, Clock, błędy bazowe
      domain/          shared kernel: CalendarDate, stay-range, date-range (czysty TS)
    infrastructure/    PrismaService, mail, queue, storage, scheduler (moduły techniczne)
    modules/<feature>/
      http/            *.controller.ts, dto/, *.mapper.ts
      application/     *.service.ts, ports/ (interfejsy + tokeny DI), policies
      domain/          reguły, value objects, errors/, events/ (czysty TS)
      infrastructure/  *.repository.ts (Prisma), adaptery
      <feature>.module.ts
  test/
    integration/       *.e2e-spec.ts
    factories/         fabryki danych testowych
```

Moduły: `auth`, `users` (admin: właściciele), `properties`, `rooms`, `photos`, `pricing`, `availability`, `reservations`, `guests`, `public` (proces gościa), `notifications`, `health`.

## Reguły zależności (pilnuj ich w każdym PR)

| Warstwa | Może importować | Nie może importować |
|-|-|-|
| `http` | `application`, DTO, `common` | `infrastructure` modułu, Prismy |
| `application` | `domain`, porty (`application/ports`), `common` | konkretnych repozytoriów, Prismy, `http` |
| `domain` | `common/domain`, inne `domain` | `@nestjs/*`, `@prisma/client`, `http`, `application` |
| `infrastructure` | `domain` (typy), porty, Prisma | `http` |

- Inny moduł jest dostępny tylko przez jego **eksportowany serwis lub port**, nigdy przez repozytorium.
- Kontroler: walidacja (DTO), wywołanie jednego serwisu, mapowanie wyniku na DTO. Bez logiki i bez zapytań.
- Encje Prismy nigdy nie są zwracane z kontrolera; zawsze idą przez mapper do DTO.
- Błędy domenowe mapuje na HTTP **tylko** globalny filtr ([http-layer.md](docs/http-layer.md#mapowanie-błędów)).
- Opcjonalnie lint `import/no-restricted-paths` wymusza te reguły (M2).

## Checklista nowego endpointu

- [ ] Endpoint jest opisany w sekcji 5 dokumentu funkcjonalności (najpierw dokument, potem kod).
- [ ] DTO wejściowe z walidacją class-validator; DTO wyjściowe + mapper.
- [ ] `@Roles()` lub `@Public()` jawnie; polityka własności w serwisie (BR-12).
- [ ] Logika w serwisie lub domenie; reguły z komentarzem `// BR-xx`.
- [ ] Transakcja, jeśli zapis dotyczy więcej niż jednej tabeli lub wymaga spójnego odczytu.
- [ ] Zdarzenie domenowe emitowane po commicie (jeśli dotyczy).
- [ ] Swagger: `@ApiTags`, `@ApiOperation`, odpowiedzi sukcesu i błędów, `operationId`.
- [ ] Kody: 201 + `Location`, 204, błędy zgodne z [api-conventions.md](../../docs/architecture/api-conventions.md).
- [ ] Testy: unit reguł + integracja (sukces, walidacja, izolacja 404, reguła).
- [ ] `pnpm --filter @klucznik/api openapi:export` i commit `openapi.json`.
- [ ] Status w dokumencie funkcjonalności + odhaczone zadanie w [roadmap.md](../../docs/roadmap.md).

## Komendy (od M2)

| Komenda | Działanie |
|-|-|
| `pnpm --filter @klucznik/api dev` | API w trybie watch (port 3000) |
| `pnpm --filter @klucznik/api build` | build do `dist/` |
| `pnpm --filter @klucznik/api test` | testy jednostkowe (Jest z `--experimental-vm-modules`, bo NestJS 12 to ESM: [Q-26](../../docs/open-questions.md#q-26)) |
| `pnpm --filter @klucznik/api test:int` | testy integracyjne (Testcontainers, wymaga Dockera, lub `TEST_DATABASE_URL`) |
| `pnpm --filter @klucznik/api prisma:generate` | klient Prismy do `src/infrastructure/prisma/generated/` (też w `postinstall`, nie commitujemy) |
| `pnpm --filter @klucznik/api prisma:migrate` | `prisma migrate dev` (nowa migracja) |
| `pnpm --filter @klucznik/api prisma:deploy` | `prisma migrate deploy` |
| `pnpm --filter @klucznik/api prisma:seed` | dane demo |
| `pnpm --filter @klucznik/api openapi:export` | zapis `packages/api-client/openapi.json` |

## Nie rób

- Nie modyfikuj `apps/web/**`. Potrzebę zmiany po stronie UI zgłoś w [handoff.md](../../docs/handoff.md).
- Nie edytuj ręcznie `openapi.json`, tylko przez skrypt eksportu.
- Nie używaj `new Date()` w logice, tylko `Clock`. Nie używaj floatów do kwot.
- Nie zwracaj 403 dla cudzego zasobu, tylko 404 (BR-12).
