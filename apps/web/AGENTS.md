# apps/web: wytyczne dla sesji `UI`

> Punkt wejścia sesji w trybie `UI` (React + Vite SPA). Czytaj po root [AGENTS.md](../../AGENTS.md).
> Zawiera zasady i linki. Szczegóły są w [docs/](docs/).

## Obowiązkowa lektura

1. dokument realizowanej funkcjonalności w [docs/features/](../../docs/features/) (sekcje 5 i 7),
2. [docs/screens.md](docs/screens.md): które ekrany Stitch dotyczą zadania, potem same pliki w [design/stitch/](../../design/),
3. dokumenty warstwy:

| Dokument | Kiedy |
|-|-|
| [docs/architecture.md](docs/architecture.md) | routing, layouty, feature folders, ochrona tras |
| [docs/data-and-auth.md](docs/data-and-auth.md) | klient API (orval), TanStack Query, logowanie i odświeżanie, błędy API |
| [docs/design-system.md](docs/design-system.md) | tokeny, typografia, komponenty, statusy |
| [docs/screens.md](docs/screens.md) | mapa ekran → route → funkcjonalność → plik Stitch → status |

## Stos

React + Vite + TypeScript `strict`, React Router, TanStack Query, React Hook Form + zod, Tailwind CSS + shadcn/ui, Vitest + Testing Library + MSW. Klient API z `@klucznik/api-client` (orval). Decyzja: [ADR 0003](../../docs/decisions/0003-react-vite-spa.md).

## Struktura

```
apps/web/src/
  app/                 router, providery (QueryClient, Auth, Toaster), layouty (PublicLayout, OwnerLayout, AdminLayout)
  features/<feature>/  components/, hooks/, pages/, schemas.ts (zod), index.ts
  shared/ui/           komponenty bazowe (shadcn/ui + własne: StatusBadge, EmptyState, ErrorState, DataTable…)
  shared/lib/          money.ts, dates.ts, api-errors.ts, cn.ts
  api/                 konfiguracja klienta: configureApiClient, interceptor tokenu, refresh, mapowanie błędów
  test/                setup Vitest, MSW handlers, render helpers
```

Feature folders: `auth`, `public-property`, `guest-booking`, `guest-reservation`, `dashboard`, `calendar`, `reservations`, `rooms`, `pricing`, `availability`, `photos`, `guests`, `property-settings`, `admin`.

## Zasady

- **Typy API wyłącznie z `@klucznik/api-client`.** Zakaz ręcznego definiowania typów odpowiedzi i ręcznych `fetch` do API.
- Brak logiki biznesowej: cenę, dostępność i reguły liczy API. Frontend tylko waliduje kształt formularzy (zod) i formatuje dane.
- Każdy widok z danymi obsługuje 4 stany: **ładowanie** (skeleton), **pusty** (`EmptyState`), **błąd** (`ErrorState` z „Spróbuj ponownie”) i **sukces**.
- Błędy API rozpoznajemy po `code` i pokazujemy po polsku ([data-and-auth.md](docs/data-and-auth.md#obsługa-błędów-api)). Nigdy nie wyświetlamy surowego `message` z serwera jako jedynej informacji.
- Kwoty: API → grosze; wyświetlanie przez `formatMoney` („1 640 zł”), a pola formularzy w złotych z konwersją. Daty: `YYYY-MM-DD` w API, „14.08.2026” w UI, tydzień od poniedziałku.
- Teksty UI po polsku, nazwy w kodzie po angielsku. Pojęcia według [glossary.md](../../docs/product/glossary.md).
- Wygląd odwzorowuje ekrany z `design/stitch/`, ale implementacja używa komponentów z design systemu (bez kopiowania HTML ze Stitch).
- Dostępność: etykiety pól, focus visible, kontrast AA, cele dotykowe ≥ 44 px (grupa docelowa 40–65 lat).

## Checklista nowego widoku

- [ ] Ekran jest w [screens.md](docs/screens.md) (route, funkcjonalność, plik Stitch).
- [ ] Route w odpowiednim layoucie z ochroną roli.
- [ ] Dane przez wygenerowane hooki; po mutacjach unieważnione odpowiednie zapytania.
- [ ] Stany: ładowanie, pusty, błąd, sukces.
- [ ] Formularz: RHF + zod, błędy `VALIDATION_ERROR` zmapowane na pola, błędy biznesowe jako alert lub inline.
- [ ] Responsywność (public: mobile-first od 375 px; panel: desktop-first, użyteczny na tablecie).
- [ ] Testy: stany widoku + kluczowe interakcje (MSW).
- [ ] Status w `screens.md` i w dokumencie funkcjonalności zaktualizowany.

## Komendy (od M10)

| Komenda | Działanie |
|-|-|
| `pnpm --filter @klucznik/web dev` | Vite (5173), proxy `/api` → `localhost:3000` |
| `pnpm --filter @klucznik/web build` | build produkcyjny |
| `pnpm --filter @klucznik/web test` | Vitest |
| `pnpm --filter @klucznik/api-client generate` | regeneracja klienta z `openapi.json` |

## Nie rób

- Nie modyfikuj `apps/api/**` ani `openapi.json`. Brakujące pole lub endpoint zgłoś w [handoff.md](../../docs/handoff.md), a do czasu realizacji użyj mocka MSW.
- Nie edytuj ręcznie `packages/api-client/src/generated/**`.
- Nie przechowuj access tokenu w `localStorage` ani `sessionStorage`.
