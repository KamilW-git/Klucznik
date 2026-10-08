# ADR 0003: React + Vite jako SPA zamiast Next.js

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** UI

## Kontekst

Frontend obejmuje trzy obszary: publiczną stronę obiektu (mobile-first), Panel Gospodarza i panel admina. Wymagania przedmiotu zakładają wyraźny podział frontend ↔ REST API i ocenę obsługi auth oraz błędów API po stronie frontendu. Strony obiektów mogą w przyszłości wymagać SEO.

## Decyzja

- **React + Vite** jako jedna SPA w `apps/web`, routing przez **React Router**.
- Stan serwera: **TanStack Query**. Formularze: **React Hook Form + zod**. UI: **Tailwind CSS + shadcn/ui**. Testy: **Vitest + Testing Library**.
- Klient API i typy generowane przez **orval** z kontraktu ([ADR 0006](0006-openapi-contract-codegen.md)). Frontend nie definiuje ręcznie typów odpowiedzi API.
- Build statyczny serwowany przez nginx w kontenerze `web`.

Uzasadnienie: SPA wymusza, że **cała logika i dostęp do danych są w API**, więc podział frontend ↔ REST API jest jednoznaczny i łatwy do pokazania na obronie. Strony obiektów renderowane pod SEO mogą w przyszłości powstać jako osobna aplikacja `apps/site` (Next.js) korzystająca z tego samego API publicznego i klienta.

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Next.js (App Router) | SSR/SEO, routing plikowy | Server Actions i route handlers zacierają granicę z REST API; większa złożoność |
| Angular | kompletny framework | cięższy, mniej popularny w portfolio React |
| Osobne SPA dla panelu i strony publicznej | mniejsze bundle | duplikacja konfiguracji; lazy loading tras rozwiązuje rozmiar |

## Konsekwencje

- **Pozytywne:** czysty kontrakt REST, prosty deployment statyczny, szybki dev server.
- **Negatywne:** brak SEO dla stron obiektów w MVP; bundle trzeba dzielić przez lazy loading per obszar.
- **Wpływ:** [apps/web/AGENTS.md](../../apps/web/AGENTS.md), [apps/web/docs/architecture.md](../../apps/web/docs/architecture.md).
