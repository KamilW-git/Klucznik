# ADR 0001: Monorepo z pnpm workspaces

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** całość

## Kontekst

Projekt składa się z API, SPA i współdzielonego kontraktu (OpenAPI + wygenerowany klient). Zmiana endpointu powinna być widoczna w kontrakcie i kliencie w tym samym repozytorium, a CI powinno sprawdzać spójność całości. Repo jest oceniane (historia commitów, README), więc jedno repo upraszcza ocenę i portfolio. Prace prowadzą osobne sesje agentów per warstwa, więc granice katalogów muszą być wyraźne.

## Decyzja

- Jedno repozytorium z **pnpm workspaces**: `apps/api`, `apps/web`, `packages/api-client`.
- TypeScript w trybie `strict` we wszystkich pakietach, wspólny `tsconfig.base.json`.
- ESLint (flat config) + Prettier na poziomie root, Node.js LTS (`.nvmrc`), pnpm przez Corepack (`packageManager`).
- Skrypty root uruchamiają zadania rekurencyjnie (`pnpm -r`). Pakiety nazywamy `@klucznik/<nazwa>`.
- Bez narzędzi typu Nx czy Turborepo w MVP.

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Osobne repo dla API i web | pełna niezależność | kontrakt trzeba publikować jako paczkę, trudniejsza ocena i CI |
| npm/yarn workspaces | brak nowego narzędzia | pnpm jest szybszy, oszczędza miejsce i ściśle izoluje zależności |
| Nx / Turborepo | cache zadań, graf zależności | nadmiarowa złożoność przy 3 pakietach |

## Konsekwencje

- **Pozytywne:** atomowe commity obejmujące API, kontrakt i klienta; jedno CI; łatwy start (`pnpm install`).
- **Negatywne:** wszystkie pakiety dzielą wersję Node i narzędzi lintujących.
- **Wpływ:** [overview.md](../architecture/overview.md#monorepo), [infrastructure.md](../architecture/infrastructure.md), tryby sesji w [AGENTS.md](../../AGENTS.md#4-tryby-sesji).
