# ADR 0002: NestJS + Prisma + PostgreSQL

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** API

## Kontekst

Przedmiot wymaga REST API z warstwami, DTO, walidacją, globalną obsługą błędów, migracjami i pełnoprawną bazą jako osobną usługą. Domena rezerwacji wymaga transakcji, blokad wierszy i ochrony przed nakładaniem się zakresów dat na poziomie bazy (BR-01, BR-09). Projekt ma być w całości w TypeScript.

## Decyzja

- **NestJS** jako framework API: moduły, DI, guardy, pipes, filtry wyjątków, `@nestjs/swagger`, `@nestjs/config`, `@nestjs/event-emitter`, `@nestjs/schedule`, `@nestjs/throttler`.
- **PostgreSQL 16** jako baza, z rozszerzeniem `btree_gist` i constraintami `EXCLUDE USING gist` dla zakresów dat.
- **Prisma ORM + Prisma Migrate**. Elementy, których Prisma nie modeluje (`EXCLUDE`, `CHECK`, rozszerzenia), dodajemy ręcznym SQL w plikach migracji (`--create-only` + edycja).
- Walidacja DTO przez **class-validator + class-transformer**.
- Prisma jest używana wyłącznie w `infrastructure/` (repozytoria). `domain/` jej nie zna.

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Express bez frameworka | prostota | warstwy, DI, walidację i dokumentację trzeba budować ręcznie |
| TypeORM | dekoratory encji, natywnie w Nest | słabsze typowanie, problematyczne migracje |
| Drizzle / Kysely | blisko SQL, świetne typy | mniej dojrzały ekosystem migracji; Prisma lepiej znana na rynku |
| MySQL / MariaDB | popularne | brak `EXCLUDE` constraint i typów zakresów |

## Konsekwencje

- **Pozytywne:** wymagania 3.0/4.0 (warstwy, DTO, walidacja, Swagger, migracje) wynikają wprost z narzędzi; gwarancja braku nakładania się rezerwacji na poziomie bazy.
- **Negatywne:** ręczny SQL w migracjach nie jest widoczny w `schema.prisma`, więc musi być opisany w dokumentacji. Blokady `FOR UPDATE` wymagają `$queryRaw`.
- **Wpływ:** [persistence-layer.md](../../apps/api/docs/persistence-layer.md), [data-model.md](../architecture/data-model.md), [business-rules.md](../architecture/business-rules.md#br-01).
