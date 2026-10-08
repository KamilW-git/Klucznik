# Klucznik – wytyczne dla agentów

> Punkt wejścia dla **każdej** sesji agenta. Czytaj zawsze jako pierwszy.
> Zawiera: opis projektu, mapę dokumentacji, tryby sesji, zasady globalne, protokoły startu i końca sesji.

## 1. Projekt w skrócie

**Klucznik – Twój e-recepcjonista.** Multi-tenant system rezerwacji dla małych obiektów noclegowych (pensjonaty, domki, agroturystyki). Gość rezerwuje na white-labelowej stronie obiektu, właściciel (`OWNER`) zarządza obiektem w **Panelu Gospodarza**, administrator (`ADMIN`) zarządza platformą.
Szczegóły: [docs/product/vision.md](docs/product/vision.md). Projekt jest jednocześnie zaliczeniem przedmiotu (cel: 5.0, [wymagania](docs/product/course-requirements.md)), portfolio i bazą produktu komercyjnego.

## 2. Struktura monorepo

```
apps/api             NestJS – REST API                        → apps/api/AGENTS.md
apps/web             React + Vite – SPA (publiczna, panel, admin) → apps/web/AGENTS.md
packages/api-client  kontrakt OpenAPI + wygenerowany klient TS   → packages/api-client/AGENTS.md
design/stitch        ekrany ze Stitch (wzorce wizualne)          → design/README.md
docs                 dokumentacja wspólna                       → docs/README.md
```

## 3. Mapa dokumentacji

Pełny indeks: [docs/README.md](docs/README.md). Najważniejsze:

| Potrzebujesz… | Czytaj |
|-|-|
| co robić w tej sesji | [docs/roadmap.md](docs/roadmap.md), [docs/handoff.md](docs/handoff.md) |
| nazwy pojęć PL↔EN (obowiązujące) | [docs/product/glossary.md](docs/product/glossary.md) |
| encje, pola, constrainty | [docs/architecture/data-model.md](docs/architecture/data-model.md) |
| reguły biznesowe BR-xx | [docs/architecture/business-rules.md](docs/architecture/business-rules.md) |
| konwencje REST, format błędów | [docs/architecture/api-conventions.md](docs/architecture/api-conventions.md) |
| specyfikację funkcjonalności | [docs/features/](docs/features/) |
| decyzje architektoniczne | [docs/decisions/](docs/decisions/) |
| nierozstrzygnięte kwestie | [docs/open-questions.md](docs/open-questions.md) |

## 4. Tryby sesji

Każda sesja działa w **dokładnie jednym** trybie, podanym w prompcie startowym. Zadania w roadmapie są oznaczone trybem.

| Tryb | Czyta obowiązkowo | Może modyfikować | Nie może modyfikować |
|-|-|-|-|
| `API` | `AGENTS.md`, [apps/api/AGENTS.md](apps/api/AGENTS.md) + dokumenty z `apps/api/docs/`, dokument funkcjonalności, [business-rules.md](docs/architecture/business-rules.md), [api-conventions.md](docs/architecture/api-conventions.md) | `apps/api/**`, `packages/api-client/openapi.json` (tylko przez skrypt eksportu), sekcje API (5, 6, 8) w dokumentach funkcjonalności | `apps/web/**` |
| `UI` | `AGENTS.md`, [apps/web/AGENTS.md](apps/web/AGENTS.md) + dokumenty z `apps/web/docs/`, dokument funkcjonalności, odpowiednie ekrany w `design/stitch/` | `apps/web/**`, `packages/api-client/**` oprócz `openapi.json` (`src/generated/**` tylko przez skrypt generowania), sekcja UI (7) w dokumentach funkcjonalności | `apps/api/**`, `openapi.json` |
| `INFRA` | `AGENTS.md`, [docs/architecture/infrastructure.md](docs/architecture/infrastructure.md) | `docker-compose*.yml`, `**/Dockerfile`, `**/nginx.conf`, `.github/**`, `.env.example`, pliki konfiguracyjne i skrypty w root (`package.json`, `pnpm-workspace.yaml`, ESLint, Prettier, `tsconfig.base.json`) | logika aplikacji (`apps/*/src/**`) |
| `DOCS` | `AGENTS.md`, `docs/**` | `docs/**`, `README.md`, pliki `AGENTS.md` / `CLAUDE.md`, `design/README.md` | kod |

Wszystkie tryby mogą dopisywać wpisy do [docs/handoff.md](docs/handoff.md) i [docs/open-questions.md](docs/open-questions.md) oraz odhaczać swoje zadania w [docs/roadmap.md](docs/roadmap.md).

### Kontrakt między warstwami

Plik `packages/api-client/openapi.json` jest **jedynym kontraktem** API ↔ UI. Jest generowany z NestJS i commitowany do repo.

1. Sesja `API` po zmianie endpointów uruchamia eksport kontraktu i commituje `openapi.json` razem z kodem.
2. Sesja `UI` uruchamia generowanie klienta (orval) i używa wyłącznie wygenerowanych typów i hooków.
3. CI sprawdza, czy `openapi.json` jest aktualny względem kodu API.

Szczegóły: [ADR 0006](docs/decisions/0006-openapi-contract-codegen.md), [packages/api-client/AGENTS.md](packages/api-client/AGENTS.md).

### Zmiana potrzebna w innej warstwie

Nie zmieniaj cudzego kodu. Dopisz wpis w [docs/handoff.md](docs/handoff.md) (od, do, co, dlaczego, status) i kontynuuj na mocku albo z TODO. Każda sesja na starcie przegląda wpisy skierowane do swojego trybu.

## 5. Zasady globalne

**Język**

- Kod, identyfikatory, nazwy plików, nazwy gałęzi: po angielsku.
- Dokumentacja, teksty w UI i e-mailach: po polsku.
- Commity: [Conventional Commits](https://www.conventionalcommits.org/). Typ i scope po angielsku, opis po polsku, np. `feat(api): dodaj sprawdzanie dostępności pokoi`. Scope'y: `api`, `web`, `api-client`, `infra`, `ci`, `docs`, `architecture`, `features`, `design`.
- Nazewnictwo pojęć zgodnie z [glossary.md](docs/product/glossary.md). Nowe pojęcie najpierw trafia do słownika.

**Dane** (szczegóły i uzasadnienie: [ADR 0007](docs/decisions/0007-money-and-dates.md))

- Kwoty: liczby całkowite w groszach (`Int`) i osobne pole `currency` (`PLN`). Nigdy float.
- Daty pobytu: typ `DATE`, w API `YYYY-MM-DD`, zakres półotwarty `[checkIn, checkOut)`.
- „Dziś” liczy się w strefie `Europe/Warsaw` przez wstrzykiwany `Clock`. Nie używaj `new Date()` w logice.
- Identyfikatory: UUID.

**Architektura**

- Reguły biznesowe mają stałe ID `BR-xx` ([katalog](docs/architecture/business-rules.md)). ID pojawia się w dokumencie funkcjonalności, w nazwie testu i w komentarzu przy implementacji (`// BR-01`).
- Izolacja danych między właścicielami (BR-12) obowiązuje w każdym zapytaniu panelu: [ADR 0008](docs/decisions/0008-multi-tenancy-ownership.md).
- Żadnych sekretów w repo. Konfiguracja przez zmienne środowiskowe, wzór w `.env.example`.

**Dokumentacja**

- Jedno źródło prawdy: informację zapisujesz w jednym miejscu, a inne pliki do niej linkują (linki względne).
- Nie wymyślaj wymagań. Niejasność trafia do [open-questions.md](docs/open-questions.md) z rekomendacją. Do czasu decyzji implementujesz rekomendację i oznaczasz to w kodzie komentarzem `// Q-xx`.
- Zmiana zachowania oznacza aktualizację dokumentu funkcjonalności w tym samym commicie.

## 6. Protokół startu sesji

Czytaj w tej kolejności:

1. ten plik (`AGENTS.md`),
2. [docs/roadmap.md](docs/roadmap.md): znajdź swój etap i zadania,
3. [docs/handoff.md](docs/handoff.md): wpisy ze statusem `OPEN` skierowane do Twojego trybu,
4. `AGENTS.md` swojej warstwy,
5. dokument realizowanej funkcjonalności w [docs/features/](docs/features/).

Jeśli coś z tej listy jest sprzeczne, zatrzymaj się i zapisz kwestię w `open-questions.md`, zamiast zgadywać.

## 7. Protokół końca sesji (Definition of Done)

- [ ] `pnpm lint`, `pnpm typecheck` i `pnpm test` przechodzą (oraz testy integracyjne, jeśli dotyczą),
- [ ] każda nowa lub zmieniona reguła BR ma test z jej ID w nazwie,
- [ ] dokumentacja jest zaktualizowana w tym samym commicie co kod,
- [ ] zadania w `roadmap.md` są odhaczone, a status w dokumencie funkcjonalności zaktualizowany,
- [ ] wpisy w `handoff.md` są dodane lub zamknięte,
- [ ] (`API`) `openapi.json` jest wyeksportowany, jeśli zmieniły się endpointy,
- [ ] commity są małe, logiczne i opisowe, bo historia commitów jest oceniana,
- [ ] na koniec sesja podaje podsumowanie: co zrobiono, co zostało, nowe pytania.

## 8. Komendy (dostępne od M1)

| Komenda | Działanie |
|-|-|
| `pnpm install` | instalacja zależności całego monorepo |
| `docker compose up -d postgres redis mailpit` | usługi do developmentu |
| `pnpm dev` | API i web w trybie watch |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm typecheck` | `tsc --noEmit` we wszystkich pakietach |
| `pnpm test` | testy jednostkowe wszystkich pakietów |
| `docker compose up --build` | pełny stack (api, web, postgres, redis, mailpit) |

Komendy poszczególnych warstw opisują `apps/api/AGENTS.md` i `apps/web/AGENTS.md`. Szczegóły infrastruktury: [infrastructure.md](docs/architecture/infrastructure.md).
