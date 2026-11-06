# Demo: scenariusz prezentacji

> Scenariusz demo video (3–5 min, wymóg formalny z [course-requirements.md](product/course-requirements.md#wymagania-formalne)) i omówienie zagadnień wymaganych podczas demonstracji. Czytaj przed nagraniem i przed obroną.
> Kolejność i czasy rozwijają plan z [roadmap.md](roadmap.md#scenariusz-demo-35-min). Zrzuty ekranów: [README](../README.md#główne-funkcjonalności).

## Przygotowanie (przed nagraniem)

1. Czysty stack z danymi demo ([README](../README.md#uruchomienie)):

   ```bash
   docker compose down -v
   docker compose up --build -d
   docker compose run --rm migrate pnpm prisma:seed
   ```

2. Karty przeglądarki, w tej kolejności:
   - **A** `http://localhost:8080/o/lesna-polana` z trybem urządzenia mobilnego (DevTools: `F12`, potem `Ctrl+Shift+M`, np. iPhone 12),
   - **B** `http://localhost:8025` (Mailpit),
   - **C** `http://localhost:8080/logowanie` jako `jan.nowak@example.com`,
   - **D** okno incognito, `http://localhost:8080/logowanie` jako `ewa.wisniewska@example.com` (drugi właściciel),
   - **E** `http://localhost:8080/api/docs` (Swagger),
   - **F** repozytorium na GitHubie: zakładka Actions z zielonym przebiegiem CI.
3. W edytorze otwarte: [business-rules.md#br-01](architecture/business-rules.md#br-01), `apps/api/src/common/domain/stay-range.ts`, migracja z `EXCLUDE` w `apps/api/prisma/migrations/`, `apps/api/test/integration/reservations.e2e-spec.ts`.
4. Hasła kont demo to `SEED_ADMIN_PASSWORD` i `SEED_OWNER_PASSWORD` z `.env`. Nie pokazuj pliku `.env` na nagraniu.

Dane z seeda, przydatne w scenariuszu: w Leśnej Polanie są 2 rezerwacje oczekujące (pulpit), `Domek Brzoza` jest zajęty przez Tomasza Lewandowskiego od dziś na 3 noce (seed liczy daty względem dnia uruchomienia), a w `Pokój Jeziorny` jest blokada „Remont”.

## Scenariusz (ok. 4 min 20 s)

| # | Czas | Co pokazujesz | Co mówisz (w skrócie) |
|-|-|-|-|
| 1 | 0:00–0:30 | README: sekcja Architektura i diagram z [overview.md](architecture/overview.md#diagram-komponentów) | Monorepo: API NestJS, SPA React, wspólny kontrakt OpenAPI, z którego generowany jest klient. Backend w warstwach `http → application → domain` + `infrastructure`. W Dockerze nginx łączy SPA i API pod jednym adresem. |
| 2 | 0:30–1:30 | Karta **A** (telefon): data przyjazdu i wyjazdu → „Sprawdź dostępność” → wybór pokoju → formularz → „Wyślij prośbę”; karta **B**: e-mail z numerem rezerwacji | Gość rezerwuje bez konta. Cenę liczy serwer, noc po nocy według cennika (BR-05). Rezerwacja ma status `PENDING` i wygaśnie bez potwierdzenia (BR-07). E-mail idzie asynchronicznie: zdarzenie po commicie, kolejka BullMQ w Redisie z ponowieniami. Link w e-mailu zawiera token, w bazie jest tylko jego hash. |
| 3 | 1:30–2:30 | Karta **C**: pulpit → „Potwierdź” przy nowej prośbie → Kalendarz → Rezerwacje → „Dodaj rezerwację”: `Domek Brzoza`, jutro → pojutrze → błąd kolizji | Właściciel widzi prośby do decyzji. Po potwierdzeniu status zmienia się według maszyny stanów (BR-06), a gość dostaje e-mail. Rezerwacja ręczna na zajęty termin kończy się błędem 409 `RESERVATION_OVERLAP` (BR-01), także przy dwóch równoczesnych żądaniach. |
| 4 | 2:30–3:00 | Karta **C** w dwóch zakładkach: ta sama rezerwacja → „Edytuj” w obu → zapis w pierwszej, potem w drugiej → komunikat o konflikcie. Karta **D**: wklej adres rezerwacji Jana (`/panel/rezerwacje/<id>`) → „Nie znaleziono rezerwacji” | Optimistic locking: `PATCH` wysyła `version`, nieaktualna wersja daje 409 `VERSION_CONFLICT` (BR-11). Izolacja danych: inny właściciel dostaje 404, a nie 403, żeby nie zdradzać, że zasób istnieje (BR-12). |
| 5 | 3:00–3:20 | Wyloguj → zaloguj jako `admin@klucznik.local` → Właściciele → „Nowy właściciel” (formularz) → Logi e-maili | Admin zakłada konta właścicieli razem z pierwszym obiektem i widzi log wszystkich wysłanych e-maili (status, ponowienia). Właściciel nie ma dostępu do `/admin` (403). |
| 6 | 3:20–3:50 | Karta **E** (Swagger, np. `POST /reservations/:id/confirm`), karta **F** (zielone CI), na liście rezerwacji status „Wygasła” | Dokumentacja API jest generowana z kodu, a kontrakt `openapi.json` jest w repo i CI sprawdza jego aktualność. CI uruchamia lint, testy jednostkowe i integracyjne z PostgreSQL oraz cały stack w Dockerze. Scheduler co 15 minut wygasza niepotwierdzone rezerwacje (BR-07). |
| 7 | 3:50–4:20 | README: ERD → `business-rules.md#br-01` → test `BR-01` → `stay-range.ts` → migracja z `EXCLUDE` | Model danych: 12 encji, centrum to Property → Room → Reservation. BR-01 ma trzy poziomy obrony: czysta funkcja w domenie, transakcja z `SELECT … FOR UPDATE` na pokoju i constraint `EXCLUDE USING gist` w bazie. Każdy poziom ma test z ID reguły w nazwie. |

Wskazówki: nagrywaj w 1920×1080 z powiększeniem przeglądarki 110–125%, bez dźwięku powiadomień systemowych. Jeśli przekroczysz 5 min, skróć krok 6 do samego Swaggera.

## Zagadnienia do omówienia

### Architektura i struktura projektu

- Monorepo pnpm: `apps/api` (NestJS), `apps/web` (React + Vite), `packages/api-client` (kontrakt OpenAPI + klient orval). Jedynym kontraktem między warstwami jest `openapi.json` ([ADR 0006](decisions/0006-openapi-contract-codegen.md)).
- API dzieli się na moduły funkcjonalne (`reservations`, `rooms`, `pricing`, …), a każdy moduł na warstwy: `http` (kontroler, DTO, walidacja), `application` (przypadek użycia, transakcja, polityka dostępu), `domain` (czyste reguły, bez NestJS i Prismy) i `infrastructure` (repozytoria Prisma). Reguły zależności: [apps/api/AGENTS.md](../apps/api/AGENTS.md#reguły-zależności-pilnuj-ich-w-każdym-pr).
- Szczegóły: [overview.md](architecture/overview.md).

### Przepływ requestu od endpointu do bazy

Przykład `POST /api/v1/public/properties/:slug/reservations` ([diagram sekwencji](architecture/overview.md#przepływ-żądania)):

1. nginx przekazuje `/api/` do kontenera `api` (z `X-Forwarded-For`).
2. Middleware: request id, helmet, cookie-parser. Guardy: limit żądań, JWT (tu `@Public()`), role.
3. `ValidationPipe` zamienia JSON na DTO (class-validator) i odrzuca nieznane pola (400).
4. Kontroler woła jeden serwis. Serwis otwiera transakcję, blokuje wiersz pokoju (`FOR UPDATE`), sprawdza reguły domeny (BR-02, BR-03, BR-04, BR-13), kolizje (BR-01) i liczy cenę (BR-05).
5. Repozytorium zapisuje rezerwację przez Prismę. Constraint `EXCLUDE` w PostgreSQL jest ostatnią linią obrony.
6. Po commicie: zdarzenie domenowe → listener zapisuje `EmailLog` i dodaje job do BullMQ → worker wysyła e-mail.
7. Kontroler mapuje wynik na DTO i zwraca `201` z nagłówkiem `Location`. Każdy błąd domenowy zamienia na HTTP globalny filtr wyjątków ([format błędu](architecture/api-conventions.md#format-błędu)).

### Model danych

- 12 encji ([ERD](architecture/data-model.md#erd)). Tenantem jest właściciel (`User` z rolą `OWNER`), a granicą izolacji obiekt (`Property.ownerId`).
- Rezerwacja należy do obiektu, pokoju i gościa, ma zamrożoną cenę (`totalPrice`, `priceBreakdown`), status z maszyny stanów, `version` (optimistic locking) i historię `ReservationEvent`.
- Kwoty to liczby całkowite w groszach, daty pobytu to `DATE` z zakresem półotwartym `[checkIn, checkOut)` ([ADR 0007](decisions/0007-money-and-dates.md)).

### Authentication i authorization

- Logowanie: hasło argon2, access token JWT (15 min) trzymany w pamięci SPA, refresh token (7 dni) w ciasteczku `kl_refresh` (`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`).
- Każdy refresh rotuje token. Użycie unieważnionego tokenu unieważnia wszystkie sesje użytkownika (wykrycie kradzieży).
- Autoryzacja: globalny `JwtAuthGuard` i `RolesGuard`. Trasa bez `@Roles()` i bez `@Public()` jest odrzucana (fail-closed). `OWNER` na `/admin/**` → 403. Polityka własności w warstwie `application` daje 404 dla cudzego zasobu (BR-12, [ADR 0008](decisions/0008-multi-tenancy-ownership.md)).
- Szczegóły: [security.md](architecture/security.md).

### Reguła biznesowa (BR-01)

- Wymaganie: rezerwacje i blokady jednego pokoju nie mogą się nakładać. Dzień wyjazdu może być dniem przyjazdu kolejnego gościa.
- Poziom 1, domena: `overlaps()` i `overlapsBlock()` w `common/domain/stay-range.ts` (testy jednostkowe).
- Poziom 2, aplikacja: w transakcji `SELECT … FOR UPDATE` na pokoju, potem wyszukanie kolizji. Dwa równoczesne żądania nie przejdą razem.
- Poziom 3, baza: `EXCLUDE USING gist` na zakresie dat dla statusów `PENDING`/`CONFIRMED`. Naruszenie (`23P01`) repozytorium zamienia na `ReservationOverlapError` → 409.
- Testy: `reservations.e2e-spec.ts` (drugi `POST` → 409, równoległe żądania → dokładnie jedno 201). Pełny opis: [business-rules.md](architecture/business-rules.md#br-01).
