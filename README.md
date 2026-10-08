# Klucznik – Twój e-recepcjonista

> System rezerwacji i zarządzania dla małych obiektów noclegowych: pensjonatów, domków letniskowych, pokoi gościnnych i agroturystyk.
> Projekt zaliczeniowy z przedmiotu ZTPAI, a jednocześnie projekt portfolio i baza produktu multi-tenant.

**Wersja oceniana:** TODO (tag `v1.0.0`, M14) · **Demo video:** TODO (M14) · **Repozytorium:** https://github.com/KamilW-git/Klucznik

## Opis projektu

Goście rezerwują nocleg **bezpośrednio na stronie obiektu**, bez prowizji pośredników. Strona jest white-label: marka obiektu, a Klucznik tylko w stopce. Właściciel zarządza obiektem w **Panelu Gospodarza**: kalendarz obłożenia, potwierdzanie rezerwacji, rezerwacje telefoniczne, cennik sezonowy, blokady terminów. Administrator zarządza kontami właścicieli. Jedna instancja aplikacji obsługuje wielu właścicieli z pełną izolacją danych.

Więcej: [docs/product/vision.md](docs/product/vision.md).

## Technologie

| Obszar | Technologie |
|-|-|
| Backend | NestJS, TypeScript, Prisma ORM + Prisma Migrate, class-validator, @nestjs/swagger, @nestjs/config, JWT + argon2, @nestjs/event-emitter, BullMQ, @nestjs/schedule, nodemailer + Handlebars, @nestjs/throttler, helmet |
| Baza danych | PostgreSQL 16 (constrainty `EXCLUDE USING gist`), Redis 7 (kolejka) |
| Frontend | React, Vite, React Router, TanStack Query, React Hook Form + zod, Tailwind CSS, shadcn/ui, orval (klient z OpenAPI) |
| Testy | Jest, supertest, Testcontainers, Vitest, Testing Library, MSW |
| Infrastruktura | pnpm workspaces (monorepo), Docker Compose, nginx, Mailpit, GitHub Actions |

Uzasadnienia decyzji: [docs/decisions/](docs/decisions/).

## Uruchomienie

> TODO (M1/M14): instrukcja zweryfikowana na świeżym klonie.

Wymagania: Docker + Docker Compose, (dev) Node.js LTS i pnpm.

```bash
git clone https://github.com/KamilW-git/Klucznik.git
cd Klucznik
cp .env.example .env        # uzupełnij sekrety
docker compose up --build   # TODO: potwierdzić w M14
```

| Usługa | Adres |
|-|-|
| Aplikacja | TODO (`http://localhost:8080`) |
| API + Swagger | TODO (`http://localhost:8080/api/docs`) |
| Mailpit (e-maile w dev) | TODO (`http://localhost:8025`) |

Konta demo z seeda: TODO.

## Główne funkcjonalności

> TODO (M14): zrzuty ekranów.

- Publiczna strona obiektu z wyszukiwaniem dostępności i ceną liczoną noc po nocy (ceny sezonowe).
- Rezerwacja online bez zakładania konta; zarządzanie i anulowanie przez bezpieczny link z e-maila.
- Panel Gospodarza: pulpit, kalendarz obłożenia, rezerwacje (filtry, wyszukiwanie, paginacja), rezerwacja ręczna, pokoje, zdjęcia, cennik, blokady, goście.
- Panel admina: konta właścicieli, obiekty, logi e-maili.
- Reguły biznesowe: brak nakładania się rezerwacji (transakcja + constraint w bazie), pojemność, minimalny pobyt, polityka anulowania, maszyna stanów, optimistic locking i inne: [business-rules.md](docs/architecture/business-rules.md).
- Asynchroniczne e-maile (kolejka z ponowieniami) i scheduler (wygasanie, zamykanie pobytów, przypomnienia).

## Model danych (ERD)

> TODO (M14): diagram z aktualnego schematu.

Model i diagram ERD: [docs/architecture/data-model.md](docs/architecture/data-model.md#erd).

## Dokumentacja REST API

> TODO (M14): tabela najważniejszych endpointów.

- Swagger UI: `/api/docs` (po uruchomieniu).
- Kontrakt OpenAPI w repo: [packages/api-client/openapi.json](packages/api-client/openapi.json) (od M2).
- Konwencje i format błędów: [docs/architecture/api-conventions.md](docs/architecture/api-conventions.md).

## Architektura

Monorepo (`apps/api`, `apps/web`, `packages/api-client`), backend w warstwach `http → application → domain` + `infrastructure`: [docs/architecture/overview.md](docs/architecture/overview.md).

## Testy

> TODO (M14): komendy i wynik.

Strategia: [docs/architecture/testing-strategy.md](docs/architecture/testing-strategy.md).

## Dokumentacja projektu

Indeks: [docs/README.md](docs/README.md). Wytyczne dla agentów AI: [AGENTS.md](AGENTS.md).
