# Klucznik – prompt startowy: dokumentacja i wytyczne dla agentów

## 0\. Rola i zakres tej sesji

Jesteś doświadczonym architektem oprogramowania i tech leadem. Pracujesz w repozytorium **Klucznik** (https://github.com/KamilW-git/Klucznik), które na razie zawiera tylko praktycznie pusty plik `.gitignore`.

**W tej sesji tworzysz wyłącznie dokumentację w plikach `.md`.** Nie twórz kodu źródłowego, `package.json`, plików konfiguracyjnych, Dockerfile ani migracji. Nie instaluj zależności. Dokumentacja, którą przygotujesz, będzie jedynym źródłem prawdy dla kolejnych sesji agentów. Te sesje będą implementować projekt warstwa po warstwie: np. jedna sesja tylko dla API, inna tylko dla UI.

Projekt ma trzy cele jednocześnie:

1. Zaliczenie przedmiotu na ocenę 5.0. Oficjalne wymagania są w `projekt\\\_aplikacji\\\_wymagania.txt` (plik dostarcza użytkownik; jeśli go brakuje, zatrzymaj się i poproś o niego).
2. Projekt do portfolio: czytelna architektura, dobre praktyki, testy, CI.
3. Produkt komercyjny: architektura multi-tenant gotowa na wielu klientów.

## 1\. Produkt

**Klucznik – Twój e-recepcjonista.** System rezerwacji i zarządzania dla małych obiektów noclegowych: pensjonatów, domków letniskowych, pokoi gościnnych, agroturystyk. Goście rezerwują bezpośrednio na stronie obiektu, bez prowizji pośredników. Właściciel zarządza obiektem w **Panelu Gospodarza**. Administrator zarządza całą platformą.

Model biznesowy: jedna instancja aplikacji (multi-tenant) obsługuje wielu właścicieli. Konta właścicieli zakłada administrator (model "full service"). Samodzielna rejestracja właścicieli to funkcja na później. Publiczna strona obiektu jest white-label: gość widzi markę obiektu, a Klucznik pojawia się tylko dyskretnie w stopce.

### Aktorzy

|Aktor|Opis|Uprawnienia|
|-|-|-|
|Gość|niezalogowany|przegląda publiczną stronę obiektu, sprawdza dostępność, tworzy rezerwację; przez link z e-maila podgląda i anuluje swoją rezerwację|
|Właściciel (`OWNER`)|zalogowany|zarządza **wyłącznie swoimi** obiektami, pokojami, zdjęciami, cenami, blokadami terminów, gośćmi i rezerwacjami; dodaje rezerwacje ręczne (np. telefoniczne)|
|Administrator (`ADMIN`)|zalogowany|pełny dostęp do wszystkich zasobów; zarządza kontami właścicieli|

### Zakres MVP (wersja na zaliczenie)

W zakres MVP wchodzą:

* auth i role,
* obiekty, pokoje i zdjęcia (upload),
* ceny sezonowe i blokady terminów,
* sprawdzanie dostępności,
* rezerwacje z regułami biznesowymi i maszyną stanów,
* rezerwacja ręczna przez właściciela,
* zarządzanie rezerwacją przez gościa za pomocą tokenu,
* asynchroniczne powiadomienia e-mail,
* scheduler (wygasanie, przypomnienia, zamykanie zakończonych pobytów),
* panel admina,
* frontend: strona publiczna, Panel Gospodarza, panel admina.

### Poza MVP

Zapisz te funkcje w roadmapie jako "Później". Projektuj tak, żeby dało się je dodać bez przebudowy:

* synchronizacja kalendarzy iCal z Booking/Airbnb (najważniejsza funkcja komercyjna),
* płatności online i zadatki,
* samodzielna rejestracja właścicieli i plany abonamentowe,
* wielu pracowników jednego obiektu,
* edytor wyglądu strony obiektu,
* osobna aplikacja SSR (Next.js) dla stron obiektów pod SEO,
* wielojęzyczność,
* opinie gości.

## 2\. Decyzje techniczne

Te decyzje są obowiązujące. Zapisz każdą jako krótki ADR.

**Monorepo:** pnpm workspaces, TypeScript `strict` wszędzie, ESLint + Prettier, Node.js LTS.

```
apps/api            NestJS – REST API
apps/web            React – frontend (strona publiczna, Panel Gospodarza, panel admina)
packages/api-client kontrakt OpenAPI + wygenerowany klient TypeScript
design/stitch       ekrany wygenerowane w Stitch (wzorce wizualne)
docs                dokumentacja wspólna
```

**Backend (`apps/api`):**

* NestJS, PostgreSQL 16.
* Prisma ORM + Prisma Migrate (migracje).
* class-validator + class-transformer (walidacja DTO).
* @nestjs/swagger (OpenAPI pod `/api/docs`).
* @nestjs/config z walidacją zmiennych środowiskowych przy starcie.
* Uwierzytelnianie JWT: krótki access token oraz refresh token w ciasteczku httpOnly, z rotacją i możliwością unieważnienia. Hasła hashowane argon2.
* @nestjs/event-emitter (zdarzenia domenowe).
* BullMQ + Redis (kolejka wysyłki e-maili z ponawianiem).
* @nestjs/schedule (zadania cykliczne).
* nodemailer + szablony Handlebars (e-maile po polsku).
* @nestjs/throttler + helmet.
* Upload plików przez abstrakcję `StorageService`. Obecna implementacja to dysk lokalny w wolumenie Dockera, później S3.
* Testy: Jest (jednostkowe), supertest + Testcontainers z PostgreSQL (integracyjne).

**Frontend (`apps/web`):**

* React + Vite, React Router.
* TanStack Query (stan serwera).
* React Hook Form + zod (formularze).
* Tailwind CSS + shadcn/ui.
* Vitest + Testing Library.
* Klient API i typy generowane przez orval z `packages/api-client/openapi.json`. Frontend nie definiuje ręcznie typów odpowiedzi API.
* Access token trzymany w pamięci, odświeżanie przez endpoint `/auth/refresh`.

Uzasadnienie wyboru React + Vite zamiast Next.js (do ADR): wymagania przedmiotu zakładają wyraźny podział frontend ↔ REST API, a SPA wymusza, że cała logika i dostęp do danych są w API. Strony obiektów renderowane pod SEO mogą w przyszłości powstać jako osobna aplikacja `apps/site` (Next.js) korzystająca z tego samego API.

**Infrastruktura:**

* Docker Compose z kontenerami: `postgres`, `redis`, `mailpit` (przechwytywanie e-maili w dev), `api`, `web` (statyczny build serwowany przez nginx).
* Healthchecki i wolumeny.
* `.env.example` w repo, prawdziwe `.env` ignorowane przez git.
* GitHub Actions: lint, typecheck, testy (z usługą PostgreSQL), build.

**Konwencje:**

* Kod, identyfikatory, nazwy plików i komunikaty commitów są po angielsku. Commity w formacie Conventional Commits (`feat(api): ...`, `fix(web): ...`, `docs: ...`). treści commitów po polsku.
* Dokumentacja oraz teksty w UI i e-mailach są po polsku. Słownik pojęć PL↔EN w `docs/product/glossary.md` jest obowiązujący dla nazewnictwa.
* Kwoty pieniężne zapisujemy jako liczby całkowite w groszach (`Int`), z walutą `PLN` w osobnym polu. Nigdy jako float.
* Daty pobytu mają typ `DATE` (bez godziny), a w API format `YYYY-MM-DD`. Zakres pobytu jest półotwarty `\\\[checkIn, checkOut)`, więc dzień wyjazdu jednego gościa może być dniem przyjazdu kolejnego.
* "Dziś" liczymy w strefie `Europe/Warsaw` przez wstrzykiwaną abstrakcję zegara (`Clock`), żeby dało się to testować.
* Identyfikatory: UUID.

## 3\. Model danych

To model wyjściowy. Rozpisz go w `docs/architecture/data-model.md` z diagramem ERD w Mermaid.

|Encja|Kluczowe pola|Relacje / uwagi|
|-|-|-|
|`User`|email (unikalny), passwordHash, firstName, lastName, role (`ADMIN`/`OWNER`), isActive|1:N Property (jako właściciel)|
|`RefreshToken`|tokenHash, expiresAt, revokedAt|N:1 User|
|`Property` (obiekt)|name, slug (unikalny, do publicznego URL), description, adres, phone, contactEmail, checkInTime, checkOutTime, cancellationDeadlineDays, pendingExpiryHours, isActive, deletedAt|N:1 User (owner); 1:N Room, Guest, Photo, Reservation|
|`Room` (pokój/domek)|name, description, capacity, basePricePerNight, minNights, isActive, deletedAt|N:1 Property; 1:N SeasonalRate, AvailabilityBlock, Photo, Reservation|
|`Photo`|storageKey, mimeType, sizeBytes, sortOrder, altText|N:1 Property, opcjonalnie N:1 Room (zdjęcie obiektu lub pokoju)|
|`SeasonalRate`|name, dateFrom, dateTo, pricePerNight, minNights (opcjonalne)|N:1 Room|
|`AvailabilityBlock`|dateFrom, dateTo, reason|N:1 Room (np. remont, użytek własny)|
|`Guest`|firstName, lastName, email, phone|N:1 Property. Goście są przypisani do obiektu, żeby dane były odizolowane między właścicielami. Unikalność (propertyId, email)|
|`Reservation`|number (czytelny, np. `KL-2026-000123`), checkIn, checkOut, guestsCount, status, source (`ONLINE`/`MANUAL`), totalPrice, currency, guestNotes, internalNotes, guestAccessTokenHash, expiresAt, cancelledAt, cancelledBy (`GUEST`/`OWNER`/`ADMIN`/`SYSTEM`), cancellationReason, version|N:1 Room, N:1 Guest, N:1 Property (denormalizacja dla zapytań i izolacji)|
|`EmailLog`|recipient, template, status (`QUEUED`/`SENT`/`FAILED`), attempts, lastError, sentAt|opcjonalnie N:1 Reservation|

Statusy rezerwacji i dozwolone przejścia (opisz je diagramem stanów w Mermaid):

* Utworzenie online daje `PENDING` z `expiresAt` = teraz + `pendingExpiryHours` obiektu. Utworzenie ręczne przez właściciela daje od razu `CONFIRMED`.
* `PENDING` → `CONFIRMED` (właściciel/admin)
* `PENDING` → `CANCELLED` (gość, właściciel, admin)
* `PENDING` → `EXPIRED` (system, scheduler)
* `CONFIRMED` → `CANCELLED` (właściciel/admin zawsze; gość tylko przed terminem z polityki anulowania)
* `CONFIRMED` → `COMPLETED` (system, po dacie wyjazdu)
* `CANCELLED`, `EXPIRED` i `COMPLETED` są stanami końcowymi.

Token gościa jest losowy (min. 32 bajty). W bazie zapisujemy tylko jego hash (SHA-256), a surowy token trafia wyłącznie do linku w e-mailu.

## 4\. Reguły biznesowe

Katalog reguł umieść w `docs/architecture/business-rules.md`.

Każda reguła ma stały identyfikator. Identyfikator pojawia się w dokumentach funkcjonalności, w nazwach lub opisach testów i w komentarzu przy implementacji. Dzięki temu da się prześledzić regułę od wymagania do testu, co przyda się na obronie projektu.

|ID|Reguła|Kod HTTP przy naruszeniu|
|-|-|-|
|BR-01|Rezerwacje pokoju nie mogą się nakładać. Kolizję tworzą rezerwacje w statusie `PENDING` lub `CONFIRMED` oraz blokady terminów. Sprawdzenie odbywa się w transakcji z blokadą wiersza pokoju (`SELECT ... FOR UPDATE`). Ostatnią linią obrony przed wyścigiem jest constraint `EXCLUDE USING gist` (rozszerzenie `btree\\\_gist`) w PostgreSQL, ograniczony do statusów `PENDING`/`CONFIRMED` i dodany ręcznym SQL w migracji Prisma|409|
|BR-02|Liczba gości nie może przekroczyć pojemności pokoju|422|
|BR-03|Pobyt musi trwać co najmniej `minNights`. Wartość pochodzi z pokoju albo ze stawki sezonowej obowiązującej w noc przyjazdu|422|
|BR-04|Przyjazd nie wcześniej niż dziś, wyjazd po przyjeździe, przyjazd maks. 365 dni naprzód, pobyt maks. 30 nocy|422|
|BR-05|Cenę liczy wyłącznie serwer jako sumę cen za każdą noc: stawka sezonowa obejmująca daną noc albo cena bazowa pokoju. Cena jest zapisywana w rezerwacji w chwili utworzenia i nie zmienia się przy późniejszej zmianie cennika. Klient nigdy nie przesyła ceny|–|
|BR-06|Zmiany statusu są dozwolone tylko zgodnie z maszyną stanów; niedozwolone przejście jest odrzucane|409|
|BR-07|Niepotwierdzona rezerwacja (`PENDING`) wygasa po `pendingExpiryHours` i zwalnia termin. Wygasanie realizuje scheduler, np. co 15 minut|–|
|BR-08|Gość może anulować potwierdzoną rezerwację najpóźniej `cancellationDeadlineDays` dni przed przyjazdem; później może to zrobić tylko właściciel|422|
|BR-09|Stawki sezonowe jednego pokoju nie mogą się nakładać|409|
|BR-10|Nie można usunąć ani dezaktywować pokoju (ani obiektu), który ma przyszłe aktywne rezerwacje. Usuwanie jest miękkie (`deletedAt`)|409|
|BR-11|Edycja rezerwacji używa optimistic locking (pole `version`); nieaktualna wersja jest odrzucana|409|
|BR-12|Izolacja danych: właściciel widzi i modyfikuje tylko zasoby swoich obiektów. Próba dostępu do cudzego zasobu zwraca 404, żeby nie ujawniać, że zasób istnieje. Brak wymaganej roli (np. OWNER na endpoincie admina) zwraca 403|404 / 403|
|BR-13|Rezerwować można tylko aktywny pokój w aktywnym obiekcie|422|

Zadania dla Ciebie:

* Przy każdej regule dopisz miejsce implementacji (warstwa/moduł) i planowane testy (jednostkowe i/lub integracyjne).
* Ustal, które reguły obowiązują przy rezerwacji ręcznej. Rekomendacja: BR-01, BR-02 i BR-13 zawsze, a BR-03 właściciel może pominąć. Zapisz to w `docs/open-questions.md` do mojej decyzji.

## 5\. Zarys API

Szczegóły rozpisz w dokumentach funkcjonalności, zgodnie z `api-conventions.md`. Prefiks wszystkich ścieżek: `/api/v1`.

* **Auth:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
* **Admin:** `GET|POST /admin/owners`, `GET|PATCH|DELETE /admin/owners/:id`, `GET /admin/properties`
* **Obiekty:** `GET|POST /properties`, `GET|PATCH|DELETE /properties/:id`
* **Pokoje:** `GET|POST /properties/:propertyId/rooms`, `GET|PATCH|DELETE /rooms/:id`
* **Zdjęcia:** `POST /properties/:id/photos`, `POST /rooms/:id/photos` (multipart), `PATCH|DELETE /photos/:id`
* **Ceny i blokady:** `GET|POST /rooms/:id/rates`, `PATCH|DELETE /rates/:id`, `GET|POST /rooms/:id/blocks`, `DELETE /blocks/:id`
* **Rezerwacje (panel):**

  * `GET /reservations` z paginacją i filtrami: obiekt, pokój, status, zakres dat, wyszukiwanie po nazwisku/e-mailu/numerze
  * `POST /properties/:id/reservations` (rezerwacja ręczna)
  * `GET|PATCH /reservations/:id`
  * `POST /reservations/:id/confirm`, `POST /reservations/:id/cancel`
* **Kalendarz:** `GET /properties/:id/calendar?from=\\\&to=` zwraca rezerwacje i blokady wszystkich pokoi w zakresie
* **Goście:** `GET /properties/:id/guests` (paginacja, wyszukiwanie)
* **Publiczne** (bez logowania, z rate limitingiem):

  * `GET /public/properties/:slug`
  * `GET /public/properties/:slug/availability?checkIn=\\\&checkOut=\\\&guests=` zwraca dostępne pokoje z wyliczoną ceną
  * `POST /public/properties/:slug/reservations`
  * `GET /public/reservations/:token`, `POST /public/reservations/:token/cancel`
* **Pliki:** `GET /files/:storageKey` (serwowanie zdjęć)

W `api-conventions.md` opisz:

* rzeczowniki w liczbie mnogiej w ścieżkach,
* kody odpowiedzi: `201` + nagłówek `Location` przy tworzeniu, `204` przy usuwaniu, `400` błąd walidacji, `401`, `403`, `404`, `409` konflikt, `422` naruszenie reguły biznesowej,
* jednolity format błędu zwracany przez globalny filtr wyjątków: `statusCode`, `error`, `code` (np. `RESERVATION\\\_OVERLAP`), `message`, `details`, `path`, `timestamp`, `requestId`,
* paginację `?page=\\\&pageSize=` (domyślnie 20, maks. 100) z odpowiedzią `{ data, meta: { page, pageSize, totalItems, totalPages } }`,
* sortowanie `?sort=field:asc`,
* daty w formacie ISO.

## 6\. Architektura backendu: warstwy

Moduły są zorganizowane według funkcjonalności (feature-first), a wewnątrz każdego modułu obowiązuje podział na warstwy:

```
apps/api/src/
  modules/<feature>/
    http/            kontrolery, DTO żądań i odpowiedzi, mappery DTO ↔ model
    application/     serwisy przypadków użycia, polityki dostępu, transakcje, emisja zdarzeń
    domain/          czysta logika biznesowa: reguły, maszyna stanów, wyliczanie ceny, błędy domenowe
    infrastructure/  repozytoria (Prisma), adaptery zewnętrzne
    <feature>.module.ts
  common/            filtr wyjątków, guardy, dekoratory, paginacja, Clock
  config/            walidacja i typowana konfiguracja
  infrastructure/    PrismaService, mail, kolejki, storage, scheduler
```

Reguły zależności, które masz opisać i których agenci mają pilnować:

* Kierunek zależności to `http → application → domain`.
* `application` korzysta z `infrastructure` przez interfejsy (porty).
* `domain` nie importuje NestJS, Prismy ani niczego z HTTP. To czysty TypeScript, testowalny bez frameworka.
* Kontrolery nie zawierają logiki biznesowej ani zapytań do bazy.
* Encje Prismy nigdy nie są zwracane z API; zawsze zwracamy DTO przez mapper.
* Błędy domenowe (np. `ReservationOverlapError`) są mapowane na kody HTTP w jednym miejscu, w globalnym filtrze.

Przepływ żądania opisz diagramem sekwencji: `Controller (walidacja DTO, guardy) → Service aplikacyjny (polityka dostępu, transakcja) → Domain (reguły) → Repository (Prisma) → PostgreSQL`. Po zapisie: zdarzenie domenowe → listener → kolejka BullMQ → worker wysyłający e-mail.

## 7\. Architektura frontendu

```
apps/web/src/
  app/                 routing, providery, layouty (PublicLayout, OwnerLayout, AdminLayout)
  features/<feature>/  komponenty, hooki i widoki danej funkcjonalności
  shared/ui/           komponenty bazowe (shadcn/ui + własne)
  shared/lib/          utilsy (formatowanie dat i kwot po polsku, obsługa błędów API)
  api/                 konfiguracja klienta (interceptor tokenu, odświeżanie, mapowanie błędów)
```

Aplikacja ma trzy obszary:

* strona publiczna obiektu (`/o/:slug`), projektowana mobile-first,
* Panel Gospodarza (`/panel/...`), desktop-first i responsywny,
* panel admina (`/admin/...`).

Zasady:

* Trasy są chronione według roli.
* Każdy widok obsługuje stany: ładowanie, pusty, błąd, sukces.
* Błędy API są pokazywane przyjaźnie po polsku, na podstawie pola `code`.
* Wygląd odwzorowuje ekrany z `design/stitch/`.

## 8\. Podział na sesje (kluczowe)

Projekt będzie rozwijany w osobnych sesjach agentów, z których każda dotyczy jednej warstwy. W root `AGENTS.md` umieść tabelę trybów sesji:

|Tryb|Czyta obowiązkowo|Może modyfikować|Nie może modyfikować|
|-|-|-|-|
|`API`|`AGENTS.md`, `apps/api/AGENTS.md` + dokumenty warstw backendu, dokument funkcjonalności, `business-rules.md`, `api-conventions.md`|`apps/api/\\\*\\\*`, `packages/api-client/openapi.json` (tylko przez skrypt eksportu), sekcje API w dokumentach funkcjonalności|`apps/web/\\\*\\\*`|
|`UI`|`AGENTS.md`, `apps/web/AGENTS.md` + dokumenty frontendu, dokument funkcjonalności, odpowiednie ekrany w `design/stitch/`|`apps/web/\\\*\\\*`, wygenerowany klient w `packages/api-client` (tylko przez skrypt generowania), sekcje UI w dokumentach funkcjonalności|`apps/api/\\\*\\\*`, `openapi.json`|
|`INFRA`|`AGENTS.md`, `docs/architecture/infrastructure.md`|`docker-compose\\\*.yml`, `Dockerfile`, `.github/\\\*\\\*`, `.env.example`, skrypty w root|logika aplikacji|
|`DOCS`|`AGENTS.md`, `docs/\\\*\\\*`|`docs/\\\*\\\*`, `README.md`, pliki `AGENTS.md`|kod|

**Kontrakt między warstwami:** plik `packages/api-client/openapi.json`, generowany z NestJS i commitowany do repo. Sesja API po zmianie endpointów eksportuje kontrakt; sesja UI regeneruje z niego klienta.

Jeśli sesja jednej warstwy potrzebuje zmiany w innej (np. UI potrzebuje nowego pola w odpowiedzi), nie zmienia cudzego kodu. Zamiast tego dopisuje wpis w `docs/handoff.md`: od kogo, do kogo, co, dlaczego, status. Każda sesja na starcie sprawdza wpisy skierowane do swojej warstwy.

**Protokół startu sesji** (czytaj w tej kolejności):

1. root `AGENTS.md`
2. `docs/roadmap.md`
3. wpisy w `docs/handoff.md` dla swojego trybu
4. `AGENTS.md` swojej warstwy
5. dokument realizowanej funkcjonalności

**Protokół końca sesji (Definition of Done):**

* lint, typecheck i testy przechodzą,
* nowe reguły mają testy,
* dokumentacja jest zaktualizowana w tym samym commicie co kod,
* zadania w `roadmap.md` są odhaczone, a status w dokumencie funkcjonalności zaktualizowany,
* wpisy w `handoff.md` są dodane lub zamknięte,
* commity są małe i opisowe (historia commitów jest oceniana).

## 9\. Struktura plików do utworzenia

```
AGENTS.md                         wejście dla każdego agenta: opis, mapa dokumentacji, tryby sesji, zasady globalne, protokoły, DoD
CLAUDE.md                         zawiera wyłącznie linię: @AGENTS.md
README.md                         szkielet z sekcjami wymaganymi przez prowadzącego (opis, technologie, uruchomienie,
                                  funkcjonalności, ERD, dokumentacja API, link do demo); TODO tam, gdzie treść powstanie później
docs/
  README.md                       indeks dokumentacji: który plik, po co, kiedy czytać
  roadmap.md                      kamienie milowe z zadaniami-checkboxami; każde zadanie oznaczone trybem
                                  \\\[API]/\\\[UI]/\\\[INFRA]/\\\[DOCS] i linkiem do dokumentu funkcjonalności
  handoff.md                      kolejka zgłoszeń między warstwami (opis formatu + pusta tabela)
  open-questions.md               pytania i niejasności do decyzji użytkownika, z Twoją rekomendacją
  product/
    vision.md                     problem, użytkownicy, propozycja wartości, zakres MVP vs później
    requirements-mapping.md       tabela: każdy wymóg z course-requirements.md (3.0 / 4.0 / 5.0 / formalne)
                                  → gdzie i jak realizowany → status
    glossary.md                   słownik PL↔EN (obiekt = Property, pokój = Room, blokada = AvailabilityBlock,
                                  stawka sezonowa = SeasonalRate, ...)
    course-requirements.md        dostarczony przez użytkownika – nie zmieniaj
  architecture/
    overview.md                   monorepo, aplikacje, diagram komponentów, przepływ żądania (sekwencja), multi-tenancy
    data-model.md                 encje, pola, typy, relacje, indeksy, constrainty, ERD (Mermaid), diagram stanów rezerwacji
    business-rules.md             katalog reguł BR-xx: opis, przykłady, kod błędu, miejsce implementacji, testy
    api-conventions.md            konwencje REST, kody, format błędów, paginacja, filtrowanie, wersjonowanie, OpenAPI
    security.md                   uwierzytelnianie (przepływ tokenów), autoryzacja (role + własność zasobu),
                                  token gościa, rate limiting, CORS, sekrety
    async-and-jobs.md             zdarzenia domenowe, kolejka e-maili, zadania schedulera
                                  (wygasanie, przypomnienia, COMPLETED), idempotencja
    testing-strategy.md           piramida testów, co testujemy na jakim poziomie, Testcontainers,
                                  nazewnictwo testów z ID reguł, minimalne progi z wymagań
    infrastructure.md             Docker Compose, zmienne środowiskowe (tabela bez wartości sekretów), CI, przyszły deployment
  decisions/
    \\\_TEMPLATE.md
    0001-monorepo-pnpm.md
    0002-nestjs-prisma-postgresql.md
    0003-react-vite-spa.md
    0004-auth-jwt-refresh-cookie.md
    0005-async-events-bullmq.md
    0006-openapi-contract-codegen.md
    0007-money-and-dates.md
    0008-multi-tenancy-ownership.md
  features/
    \\\_TEMPLATE.md
    auth.md
    admin-owners.md
    properties.md
    rooms.md
    photos.md
    pricing.md                    ceny bazowe i sezonowe, wyliczanie ceny pobytu
    availability.md               blokady terminów, sprawdzanie dostępności, kalendarz
    reservations.md               rezerwacje w panelu, maszyna stanów, rezerwacja ręczna
    guest-booking.md              publiczny proces rezerwacji i zarządzanie przez token
    guests.md
    notifications.md              e-maile i scheduler
apps/api/
  AGENTS.md                       wejście dla sesji API: struktura modułu, reguły zależności, komendy, checklista nowego endpointu
  CLAUDE.md                       @AGENTS.md
  docs/
    http-layer.md                 kontrolery, DTO, walidacja, Swagger, guardy, kody odpowiedzi, mappery
    application-layer.md          serwisy, polityki dostępu, transakcje, emisja zdarzeń
    domain-layer.md               reguły, maszyna stanów, błędy domenowe, Clock, testy jednostkowe
    persistence-layer.md          schemat Prisma, migracje (w tym ręczny SQL), repozytoria, seed, soft delete, indeksy
    integrations.md               mail, kolejki, scheduler, storage – porty i adaptery
apps/web/
  AGENTS.md                       wejście dla sesji UI: struktura, zasady, komendy, checklista nowego widoku
  CLAUDE.md                       @AGENTS.md
  docs/
    architecture.md               routing, layouty, feature folders, ochrona tras
    data-and-auth.md              klient API (orval), TanStack Query, przepływ logowania i odświeżania, obsługa błędów
    design-system.md              szkielet: tokeny kolorów, typografia, odstępy, komponenty;
                                  do uzupełnienia w pierwszej sesji UI na podstawie design/stitch
    screens.md                    mapa: ekran → route → funkcjonalność → plik w design/stitch → status
packages/api-client/
  AGENTS.md                       pliki generowane – nie edytować ręcznie; jak eksportować kontrakt i regenerować klienta
design/
  README.md                       konwencja folderów i nazw ekranów ze Stitch
```

### Szablon dokumentu funkcjonalności (`docs/features/\\\_TEMPLATE.md`)

1. Cel i wartość dla użytkownika
2. Historyjki użytkownika (z rolą)
3. Reguły biznesowe (tylko odwołania do ID z `business-rules.md`)
4. Model danych: których encji dotyczy
5. Kontrakt API: tabela z kolumnami metoda, ścieżka, rola, request, response, kody błędów
6. Backend: zadania (checklista)
7. Frontend: ekrany i zadania (checklista, odwołania do `screens.md`)
8. Testy: lista przypadków z ID reguł
9. Kryteria akceptacji
10. Status i otwarte kwestie

### Konwencja ekranów (`design/README.md`)

```
design/stitch/
  public/01-property-page.png        (+ opcjonalnie wariant -mobile.png i wyeksportowany kod .html)
  public/02-availability.png
  owner/01-login.png
  admin/01-owners.png
  ...
```

Ekrany ze Stitch to wzorzec wyglądu (układ, kolory, typografia, hierarchia), a nie kod do kopiowania 1:1. Implementacja ma używać komponentów z design systemu.

## 10\. Roadmapa

To roadmapa wyjściowa; rozwiń ją w `docs/roadmap.md`.

|Etap|Tryb|Zakres|
|-|-|-|
|M0|DOCS|Dokumentacja i wytyczne (ta sesja)|
|M1|INFRA|Szkielet monorepo, lint/format, Docker Compose (postgres, redis, mailpit), CI|
|M2|API|Bootstrap API: konfiguracja i walidacja env, globalny filtr wyjątków, ValidationPipe, Swagger, health check, Clock, paginacja|
|M3|API|Schemat Prisma, migracje (w tym constraint EXCLUDE), seed danych demo|
|M4|API|Auth, role, guardy, zarządzanie właścicielami przez admina|
|M5|API|Obiekty, pokoje, zdjęcia (upload), izolacja danych|
|M6|API|Cennik i blokady, sprawdzanie dostępności, kalendarz|
|M7|API|Rezerwacje: reguły, maszyna stanów, rezerwacja ręczna, optimistic locking|
|M8|API|Publiczny proces rezerwacji i token gościa|
|M9|API|Zdarzenia, kolejka e-maili, szablony, scheduler|
|M10|UI|Setup frontendu, design system z ekranów Stitch, logowanie i odświeżanie tokenu|
|M11|UI|Panel Gospodarza: dashboard, kalendarz, rezerwacje, pokoje, ustawienia|
|M12|UI|Strona publiczna obiektu i proces rezerwacji|
|M13|UI|Panel admina|
|M14|DOCS/INFRA|Uzupełnienie testów do progów, README, ERD, dokumentacja API, przygotowanie demo, tag `v1.0.0`|
|Później|–|iCal, płatności, samodzielna rejestracja, Next.js dla stron obiektów, wielu pracowników obiektu|

## 11\. Zasady pisania tej dokumentacji

* Pisz zwięźle i konkretnie, bo dokumentację czytają agenci z ograniczonym kontekstem. Cel: każdy plik do ok. 250 linii.
* Jedno źródło prawdy: każda informacja jest w jednym miejscu, a inne pliki do niej linkują (linki względne).
* Każdy plik zaczyna się od 2–3 linii mówiących, czego dotyczy i kiedy go czytać.
* Używaj tabel, checklist i diagramów Mermaid (ERD, maszyna stanów, sekwencja przepływu żądania, komponenty).
* Pliki `AGENTS.md` warstw to krótkie punkty wejścia (zasady + linki). Szczegóły są w folderach `docs/` danej warstwy.
* Nie wymyślaj wymagań, których nie ma w tym prompcie ani w `course-requirements.md`. Jeśli coś jest niejasne, zapisz to w `docs/open-questions.md` z rekomendacją, zamiast zgadywać po cichu.
* W `requirements-mapping.md` każdy punkt wymagań musi wskazywać konkretne miejsce realizacji. Przykład dla elementu rozszerzonego: wysyłka e-maili, scheduler, upload plików, optimistic locking, CI.

## 12\. Sposób pracy w tej sesji

1. Przejrzyj repozytorium i `docs/product/course-requirements.md`.
2. Pokaż mi plan: listę plików z jednym zdaniem opisu każdego i ewentualne wątpliwości. Poczekaj na moją akceptację.
3. Twórz pliki w kolejności: root `AGENTS.md` → `docs/product` → `docs/architecture` → `docs/decisions` → `docs/features` → pliki warstw `apps/\\\*` i `packages/\\\*` → `design/README.md` → `roadmap.md`, `handoff.md`, `open-questions.md`, `README.md`.
4. Przed zakończeniem zrób samokontrolę:

   * nazewnictwo jest spójne z `glossary.md`,
   * każda reguła BR ma miejsce implementacji i testy,
   * każdy wymóg z `course-requirements.md` jest w `requirements-mapping.md`,
   * linki względne działają,
   * pliki nie są ze sobą sprzeczne.
5. nie Commituj samodzielnie. Jeśli commit jest potrzebny napisz komendy git add <pliki> i tresc commita git commit -m "<tresc commit>" zeby uzytkownik mogl sobie sam zacommitowac. commity docelowo w kilku logicznych commitach, np. (treści commitow w języku polskim):

   * `docs: add root agent guidelines`
   * `docs(architecture): add data model and business rules`
   * `docs(features): add feature specs`
   * `docs(api): add backend layer guides`
   * `docs(web): add frontend layer guides`
6. Na koniec podsumuj, co powstało, wypisz otwarte pytania i zaproponuj prompt startowy dla pierwszej sesji `INFRA` (M1).

