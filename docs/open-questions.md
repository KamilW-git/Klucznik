# Otwarte pytania

> Niejasności i decyzje do podjęcia przez właściciela projektu, każda z rekomendacją. Czytaj, gdy dokumentacja odsyła do `Q-xx` albo gdy trafisz na niejasność.
> Do czasu decyzji agenci implementują **rekomendację** i oznaczają miejsce w kodzie komentarzem `// Q-xx`. Po decyzji zmień status, zaktualizuj dokumenty źródłowe i usuń komentarze z kodu.

Statusy: `OTWARTE` (obowiązuje rekomendacja), `ZDECYDOWANE` (z datą i decyzją), `ODRZUCONE`.

| ID | Temat | Status |
|-|-|-|
| [Q-01](#q-01) | Reguły przy rezerwacji ręcznej | OTWARTE |
| [Q-02](#q-02) | Zakres edycji rezerwacji (`PATCH`) | OTWARTE |
| [Q-03](#q-03) | E-mail gościa przy rezerwacji ręcznej | OTWARTE |
| [Q-04](#q-04) | Aktualizacja danych powracającego gościa | OTWARTE |
| [Q-05](#q-05) | Historia rezerwacji (`ReservationEvent`) | OTWARTE |
| [Q-06](#q-06) | Reset hasła | OTWARTE |
| [Q-07](#q-07) | Logi e-maili i obiekt przy zakładaniu właściciela | OTWARTE |
| [Q-08](#q-08) | Endpoint pulpitu | OTWARTE |
| [Q-09](#q-09) | Przypomnienia przed przyjazdem | OTWARTE |
| [Q-10](#q-10) | Semantyka usunięcia właściciela | OTWARTE |
| [Q-11](#q-11) | Ważność tokenu gościa | OTWARTE |
| [Q-12](#q-12) | Numeracja rezerwacji | OTWARTE |
| [Q-13](#q-13) | Struktura adresu obiektu | OTWARTE |
| [Q-14](#q-14) | Limity zdjęć | OTWARTE |
| [Q-15](#q-15) | Blokada terminu a istniejąca rezerwacja | ZDECYDOWANE |
| [Q-16](#q-16) | Link z tokenem w kolejnych e-mailach | OTWARTE |
| [Q-17](#q-17) | Endpointy wynikające z ekranów Stitch | ZDECYDOWANE |
| [Q-18](#q-18) | Edycja i usuwanie danych gości (RODO) | OTWARTE |
| [Q-19](#q-19) | Akceptacja regulaminu przy rezerwacji | OTWARTE |
| [Q-20](#q-20) | Udogodnienia pokoi i obiektu | OTWARTE |
| [Q-21](#q-21) | Prettier a pliki Markdown | OTWARTE |
| [Q-22](#q-22) | Kto i kiedy tworzy `orval.config.ts` | OTWARTE |
| [Q-23](#q-23) | Testy w jobie CI `quality` | OTWARTE |
| [Q-24](#q-24) | Hosty usług w `.env.example` | ZDECYDOWANE |
| [Q-25](#q-25) | Zmienna `POSTGRES_PORT` | ZDECYDOWANE |
| [Q-26](#q-26) | Jest a NestJS 12 (tylko ESM) | ZDECYDOWANE |
| [Q-27](#q-27) | Zakres health checku przed M3 i kod błędu 503 | ZDECYDOWANE |

## Q-01

**Które reguły obowiązują przy rezerwacji ręcznej (`MANUAL`)?**
Rekomendacja: BR-01, BR-02 i BR-13 zawsze. BR-03 właściciel może pominąć flagą `ignoreMinNights`. BR-04 obowiązuje z wyjątkiem „przyjazd nie wcześniej niż dziś”: dopuszczamy przyjazd do 30 dni wstecz (wpisanie pobytu, który już trwa lub był przyjęty „na słowo”). BR-05 zawsze (cena z serwera).
Wpływ: [business-rules.md](architecture/business-rules.md#zakres-reguł-wg-źródła-rezerwacji), [reservations.md](features/reservations.md).

## Q-02

**Co można zmienić przez `PATCH /reservations/:id`?**
Rekomendacja: `internalNotes` zawsze. `guestNotes`, `guestsCount`, `roomId`, `checkIn`, `checkOut` tylko dla `PENDING`/`CONFIRMED` z `checkIn ≥ dziś`. Zmiana dat lub pokoju ponownie sprawdza BR-01…05 i BR-13 i **przelicza cenę według aktualnego cennika**. Inne przypadki zwracają 409 `RESERVATION_NOT_EDITABLE`.
Alternatywa: tylko notatki w MVP (prościej, ale O4 ma przycisk „Edytuj”).

## Q-03

**Czy e-mail gościa jest wymagany przy rezerwacji ręcznej (telefonicznej)?**
Rekomendacja: opcjonalny dla `MANUAL`, wymagany dla `ONLINE`. Bez e-maila nie ma tokenu ani e-maili do gościa. `UNIQUE(propertyId, email)` dopuszcza wiele wartości `NULL`.

## Q-04

**Gość rezerwuje ponownie z tym samym e-mailem, ale innymi danymi. Co robimy?**
Rekomendacja: aktualizujemy `firstName`, `lastName` i `phone` do najnowszych (jeden rekord gościa na e-mail w obiekcie). Historyczne rezerwacje wskazują na tego samego gościa.

## Q-05

**Czy dodać encję `ReservationEvent` (historia zmian)?**
Ekran O4 pokazuje timeline („Utworzona online”, „Potwierdzona przez gospodarza”). Rekomendacja: tak, bo to tania tabela z dużą wartością dla właściciela i na obronie (audyt, kto i kiedy zmienił). Alternatywa: timeline z pól `createdAt`, `confirmedAt`, `cancelledAt` (bez edycji).

## Q-06

**Reset hasła („Nie pamiętasz hasła?” w O1)?**
Rekomendacja: poza MVP. Link ukryty, a w razie potrzeby admin ustawia nowe hasło tymczasowe (`PATCH /admin/owners/:id`). Reset e-mailem trafia do „Później”.

## Q-07

**Logi e-maili w panelu admina (A1) i „Utwórz od razu obiekt” przy zakładaniu właściciela.**
Zarys API ich nie zawiera, a ekran A1 tak. Rekomendacja: `GET /admin/email-logs` (paginacja, filtr statusu) oraz opcjonalne pole `property: { name, slug? }` w `POST /admin/owners` (obiekt w tej samej transakcji).

## Q-08

**Skąd pulpit (O2) bierze KPI?**
Rekomendacja: `GET /properties/:id/dashboard` z agregatami (przyjazdy i wyjazdy dziś, oczekujące, obłożenie, listy). Alternatywa: składanie z istniejących list po stronie UI (więcej żądań, logika w UI).

## Q-09

**Przypomnienia schedulera: komu i kiedy?**
Rekomendacja: e-mail do gościa 2 dni przed przyjazdem (job codziennie o 09:00), tylko dla `CONFIRMED` z e-mailem, idempotentnie przez `reminderSentAt`. Bez przypomnień dla właściciela w MVP (ma pulpit).

## Q-10

**Co oznacza `DELETE /admin/owners/:id`?**
Rekomendacja: dezaktywacja (`isActive = false`) + unieważnienie refresh tokenów, bez twardego usuwania (zachowanie historii). Obiekty zablokowanego właściciela **pozostają** aktywne publicznie; admin może je dezaktywować osobno. `PATCH { isActive: true }` przywraca konto.

## Q-11

**Jak długo działa link z tokenem gościa?**
Rekomendacja: do `checkOut + 30 dni`, potem 404 „Link jest nieaktualny”. Ważność wyliczana, bez dodatkowego pola.

## Q-12

**Jak generować numer `KL-2026-000123`?**
Rekomendacja: globalny licznik per rok (`ReservationCounter`), inkrementowany w transakcji tworzenia rezerwacji. Numer jest unikalny w całej platformie. Alternatywa: licznik per obiekt (krótsze numery, ale potrzebny prefiks obiektu).

## Q-13

**Struktura adresu obiektu.**
Rekomendacja: pola `street`, `postalCode` (`NN-NNN`), `city`. W bazie opcjonalne (obiekt zakładany przez admina może nie mieć adresu), ale wymagane w `POST /properties`. Mapa w P1 to placeholder lub link do Google Maps z adresu (bez integracji).

## Q-14

**Limity zdjęć.**
Rekomendacja: JPG, PNG, WebP; maks. 10 MB na plik; maks. 20 zdjęć obiektu i 20 na pokój. Bez skalowania i miniatur w MVP (opcjonalnie `sharp` później).

## Q-15

**Czy można zablokować termin, na który istnieje aktywna rezerwacja?**
Rekomendacja: nie. 409 `BLOCK_OVERLAPS_RESERVATION` z numerem rezerwacji, a właściciel musi najpierw anulować lub przenieść rezerwację. Blokady mogą nakładać się na siebie.
**Decyzja (2026-10-09):** zgodnie z rekomendacją, wdrożone w M6 ([availability.md](features/availability.md#5-kontrakt-api)): `details` zawiera `conflictingReservationId` i `conflictingReservationNumber`.

## Q-16

**Jak wysyłać link `/r/:token` w kolejnych e-mailach, skoro przechowujemy tylko hash?**
Rekomendacja: każdy e-mail z linkiem (`reservation-received`, `reservation-confirmed`, `stay-reminder`) generuje nowy token i nadpisuje hash. Działa wtedy tylko najnowszy link, a stare pokazują „Link jest nieaktualny – użyj linku z najnowszego e-maila”.
Alternatywy: link tylko w pierwszym e-mailu (gorszy UX); przechowywanie tokenu zaszyfrowanego (narusza zasadę „tylko hash”); tabela wielu tokenów (więcej złożoności).

## Q-17

**Endpointy wynikające z ekranów Stitch, których nie ma w zarysie API.**
Rekomendacja, wszystkie bez danych wrażliwych:

- `GET /rooms/:id/quote` dla „Ceny wyliczonej” i kolizji w O5,
- `GET /public/properties/:slug/occupancy` dla mini-kalendarza zajętości w P2,
- `GET /public/properties/:slug/availability` zwraca **wszystkie** aktywne pokoje z powodem niedostępności (P2 pokazuje pokój niedostępny i informację o minimalnym pobycie), a nie tylko dostępne.

**Decyzja (2026-10-09):** zgodnie z rekomendacją. `GET /rooms/:id/quote` wdrożone w M6 ([availability.md](features/availability.md#5-kontrakt-api)); oba endpointy publiczne w M8 korzystają z tego samego `AvailabilityService.check`.

## Q-18

**Edycja i usuwanie danych gości (RODO).**
Rekomendacja: poza MVP. Lista gości tylko do odczytu, a dane zmieniają się przy kolejnych rezerwacjach (Q-04). Później: edycja, anonimizacja na żądanie i retencja.

## Q-19

**Akceptacja regulaminu i polityki prywatności (checkbox w P3).**
Rekomendacja: w MVP walidacja tylko w UI, bez zapisu w bazie i bez treści regulaminu (link-placeholder). Później: pole `termsAcceptedAt` w rezerwacji i regulamin per obiekt.

## Q-20

**Udogodnienia („Prywatny pomost”, „Sauna”, ikony udogodnień pokoi w P1 i P2).**
Model danych ich nie zawiera. Rekomendacja: w MVP udogodnienia tylko w opisach (`description`), a ikony na ekranach pomijamy lub zastępujemy pojemnością i minimalnym pobytem. Później: słownik udogodnień + relacja M:N z pokojem i obiektem.

## Q-21

**Czy Prettier formatuje dokumentację (`*.md`)?**
Dokumentacja używa zwartych tabel `|-|-|`, a Prettier wyrównuje kolumny i przepisałby większość plików w `docs/`. Rekomendacja: `*.md` w `.prettierignore` (stan od M1). Styl Markdown pilnuje sesja `DOCS`. Alternatywa: jednorazowe sformatowanie całej dokumentacji w sesji `DOCS` i usunięcie wyjątku.

## Q-22

**Kto i kiedy tworzy `packages/api-client/orval.config.ts`?**
[packages/api-client/AGENTS.md](../packages/api-client/AGENTS.md) przypisuje plik sesji `INFRA` w M1, a [roadmapa](roadmap.md#m10-setup-frontendu-ui) przypisuje „Konfigurację orval i mutatora” sesji `UI` w M10. Rekomendacja: w całości M10 (`UI`), bo w M1 nie ma jeszcze zależności orval ani `openapi.json`. Po decyzji poprawić tabelę „Kto co zmienia” w `packages/api-client/AGENTS.md`.

## Q-23

**Czy job CI `quality` uruchamia `pnpm test`?**
[infrastructure.md](architecture/infrastructure.md#ci) wymienia w `quality` tylko lint, format i typecheck, a testy w `test-api` i `test-web`. W M1 `quality` uruchamia też `pnpm test`, żeby od początku pilnować testów. Rekomendacja: `quality` uruchamia testy jednostkowe (`pnpm test`, szybkie, bez usług), `test-api` tylko `test:int` z Postgresem, a `test-web` zostaje usunięty albo pokrywa testy wymagające przeglądarki. Po decyzji poprawić tabelę CI w `infrastructure.md`.

## Q-24

**Jakie hosty usług trafiają do `.env.example`?**
Tabela w [infrastructure.md](architecture/infrastructure.md#zmienne-środowiskowe) podaje jako domyślne nazwy usług Compose (`redis`, `mailpit`, `@postgres`), ale podstawowy tryb dev to `pnpm dev` na hoście, gdzie te nazwy się nie rozwiązują. Rekomendacja (stan od M1): `.env.example` ma `localhost`, a usługa `api` w `docker-compose.yml` nadpisuje `DATABASE_URL`, `REDIS_HOST` i `SMTP_HOST` nazwami usług. Po decyzji poprawić kolumnę „Domyślna (dev)” w `infrastructure.md`.
**Decyzja (2026-10-08):** zgodnie z rekomendacją. `.env.example` zawiera `localhost`, a usługa `api` w `docker-compose.yml` nadpisuje `DATABASE_URL`, `REDIS_HOST` i `SMTP_HOST` nazwami usług. Zaktualizowano `infrastructure.md` (kolumna „Domyślna (dev)”) i usunięto komentarze `Q-24` z konfiguracji ([H-005, H-006](handoff.md#zgłoszenia)).

## Q-25

**Zmienna `POSTGRES_PORT` (port Postgresa na hoście).**
Na maszynie deweloperskiej port 5432 może zajmować lokalnie zainstalowany PostgreSQL (np. usługa Windows `postgresql-x64-17`). Od M1 `docker-compose.yml` mapuje `127.0.0.1:${POSTGRES_PORT:-5432}:5432`, a `.env.example` zawiera `POSTGRES_PORT=5432`. Rekomendacja: zostawić i dopisać zmienną do tabeli w [infrastructure.md](architecture/infrastructure.md#zmienne-środowiskowe) (usługa `postgres`, niewymagana, domyślnie `5432`, „port na hoście; przy zmianie popraw `DATABASE_URL`”).
**Decyzja (2026-10-08):** zgodnie z rekomendacją. `POSTGRES_PORT` zostaje (niewymagana, domyślnie `5432`). Dopisano wiersz w tabeli `infrastructure.md` i usunięto komentarze `Q-25` z konfiguracji ([H-005, H-006](handoff.md#zgłoszenia)).

## Q-26

**Jest a NestJS 12, które jest wydawane wyłącznie jako ESM.**
Pakiety `@nestjs/*` w wersji 12 mają `"type": "module"` bez eksportu `require`. API zostaje projektem CommonJS (jak oficjalny szablon `nest new` w wariancie TS): Node 24 ładuje pakiety ESM przez `require(esm)`, a Jest robi to tylko z flagą `node --experimental-vm-modules` (skrypty `test` i `test:int` w `apps/api/package.json`, ostrzeżenie `ExperimentalWarning` jest oczekiwane). Ten sam powód sprawia, że skrypty TS uruchamiamy po `nest build` (`openapi:export`), a nie przez `tsx`, które nie emituje `emitDecoratorMetadata`.
**Decyzja (2026-10-08):** zostajemy przy Jest w projekcie CommonJS z `--experimental-vm-modules`, zgodnie z [testing-strategy.md](architecture/testing-strategy.md) i szablonem Nesta.
Odrzucona alternatywa: projekt ESM (`"type": "module"`) z Vitestem (wariant `ts-esm` szablonu Nesta). Wymagałaby zmiany strategii testów i ADR. Powrót do tematu tylko wtedy, gdy flaga eksperymentalna zacznie realnie przeszkadzać (np. w M3 z klientem Prismy).

## Q-27

**Co sprawdza `GET /health` przed M3 i jaki kod ma odpowiedź 503?**
[integrations.md](../apps/api/docs/integrations.md#health-check) przewiduje wskaźniki `database` (Prisma) i `redis`, ale Prisma dochodzi w M3, a Redis w M9.
Odpowiedź 503 (wskaźnik `down`) przechodzi przez globalny filtr, który w M2 nie ma kodu dla tego statusu (wynik: `INTERNAL_ERROR`).
**Decyzja (2026-10-08):**
- M2: health check to sam liveness (`200 { status: 'ok' }`), bez wskaźników.
- M3 (zrealizowane): wskaźnik `database` (ping bazy) oraz kod ogólny `SERVICE_UNAVAILABLE` (503) w `error-http-map.ts` i w [api-conventions.md](architecture/api-conventions.md#metody-i-kody-odpowiedzi); wynik terminusa trafia do `details`. Zadanie w [roadmap.md](roadmap.md#m3-schemat-i-migracje-api).
- M9: wskaźnik `redis`.
