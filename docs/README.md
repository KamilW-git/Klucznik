# Indeks dokumentacji

> Który plik, po co i kiedy go czytać. Punkt wejścia dla agentów to root [AGENTS.md](../AGENTS.md), a ten plik jest pełną mapą.
> Zasada: każda informacja jest w jednym miejscu, a pozostałe pliki do niej linkują.

## Koordynacja pracy

| Plik | Po co | Kiedy czytać |
|-|-|-|
| [roadmap.md](roadmap.md) | etapy M0–M14, zadania z trybem sesji | start każdej sesji |
| [handoff.md](handoff.md) | zgłoszenia między warstwami | start każdej sesji (wpisy dla swojego trybu) |
| [open-questions.md](open-questions.md) | decyzje do podjęcia, rekomendacje `Q-xx` | gdy dokument odsyła do `Q-xx` lub coś jest niejasne |

## Produkt (`product/`)

| Plik | Po co | Kiedy czytać |
|-|-|-|
| [vision.md](product/vision.md) | problem, aktorzy, wartość, zakres MVP i „później” | na początku, przy wątpliwościach co do zakresu |
| [glossary.md](product/glossary.md) | **obowiązujący** słownik PL ↔ EN | przy nazywaniu czegokolwiek |
| [requirements-mapping.md](product/requirements-mapping.md) | wymagania przedmiotu → miejsce realizacji → status | planowanie, koniec etapu, przed obroną |
| [course-requirements.md](product/course-requirements.md) | oficjalne wymagania (nie modyfikować) | weryfikacja wymagań |

## Architektura (`architecture/`)

| Plik | Po co | Kiedy czytać |
|-|-|-|
| [overview.md](architecture/overview.md) | monorepo, komponenty, warstwy, przepływ żądania, multi-tenancy | na początku, przed obroną |
| [data-model.md](architecture/data-model.md) | encje, pola, constrainty, ERD, maszyna stanów | praca nad schematem i logiką rezerwacji |
| [business-rules.md](architecture/business-rules.md) | reguły BR-01…BR-13: kody, implementacja, testy | każda praca nad logiką |
| [api-conventions.md](architecture/api-conventions.md) | REST, kody, format błędu, paginacja, daty, kwoty | każdy nowy endpoint i obsługa błędów w UI |
| [security.md](architecture/security.md) | tokeny, autoryzacja, token gościa, rate limiting, sekrety | auth, endpointy publiczne, konfiguracja |
| [async-and-jobs.md](architecture/async-and-jobs.md) | zdarzenia, kolejka e-maili, scheduler, idempotencja | M9 i zmiany wywołujące e-maile |
| [testing-strategy.md](architecture/testing-strategy.md) | piramida testów, nazewnictwo z ID reguł, progi | pisanie testów, DoD |
| [infrastructure.md](architecture/infrastructure.md) | Docker Compose, zmienne środowiskowe, CI | sesje `INFRA`, nowe zmienne env |

## Decyzje (`decisions/`)

ADR-y z uzasadnieniem i alternatywami. Nowa decyzja powstaje z [_TEMPLATE.md](decisions/_TEMPLATE.md).

| ADR | Decyzja |
|-|-|
| [0001](decisions/0001-monorepo-pnpm.md) | Monorepo z pnpm workspaces |
| [0002](decisions/0002-nestjs-prisma-postgresql.md) | NestJS + Prisma + PostgreSQL |
| [0003](decisions/0003-react-vite-spa.md) | React + Vite SPA zamiast Next.js |
| [0004](decisions/0004-auth-jwt-refresh-cookie.md) | JWT + refresh token w ciasteczku httpOnly |
| [0005](decisions/0005-async-events-bullmq.md) | Zdarzenia domenowe + BullMQ |
| [0006](decisions/0006-openapi-contract-codegen.md) | Kontrakt OpenAPI i generowany klient |
| [0007](decisions/0007-money-and-dates.md) | Kwoty w groszach, daty i zakresy |
| [0008](decisions/0008-multi-tenancy-ownership.md) | Multi-tenancy przez własność obiektu |

## Funkcjonalności (`features/`)

Specyfikacje według [_TEMPLATE.md](features/_TEMPLATE.md): historyjki, reguły, kontrakt API, zadania backendu i frontendu, testy, kryteria akceptacji. Czytaj dokument funkcjonalności, którą realizujesz.

| Plik | Zakres | Etapy |
|-|-|-|
| [auth.md](features/auth.md) | logowanie, refresh, role | M4, M10 |
| [admin-owners.md](features/admin-owners.md) | panel admina: właściciele, obiekty, logi e-maili | M4, M9, M13 |
| [properties.md](features/properties.md) | obiekty, ustawienia, pulpit | M5, M11 |
| [rooms.md](features/rooms.md) | pokoje | M5, M11 |
| [photos.md](features/photos.md) | upload i serwowanie zdjęć | M5, M11 |
| [pricing.md](features/pricing.md) | cennik i wyliczanie ceny | M6, M11 |
| [availability.md](features/availability.md) | blokady, dostępność, kalendarz | M6, M11 |
| [reservations.md](features/reservations.md) | rezerwacje w panelu, stany, rezerwacja ręczna | M7, M11 |
| [guest-booking.md](features/guest-booking.md) | strona publiczna, rezerwacja online, token gościa | M8, M12 |
| [guests.md](features/guests.md) | baza gości | M7, M11 |
| [notifications.md](features/notifications.md) | e-maile i scheduler | M9 |

## Dokumentacja warstw

| Plik | Dla trybu |
|-|-|
| [apps/api/AGENTS.md](../apps/api/AGENTS.md) + [apps/api/docs/](../apps/api/docs/) | `API` |
| [apps/web/AGENTS.md](../apps/web/AGENTS.md) + [apps/web/docs/](../apps/web/docs/) | `UI` |
| [packages/api-client/AGENTS.md](../packages/api-client/AGENTS.md) | `API`, `UI` |
| [design/README.md](../design/README.md) | `UI`, użytkownik (ekrany Stitch) |

## Prompty (`prompts/`)

| Plik | Po co |
|-|-|
| [01-prompt-agent-dokumentacja.md](prompts/01-prompt-agent-dokumentacja.md) | prompt startowy sesji M0 (źródło tej dokumentacji) |
| [02-prompty-stitch.md](prompts/02-prompty-stitch.md) | prompty do generowania ekranów w Stitch |
