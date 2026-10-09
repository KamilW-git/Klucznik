# Katalog reguł biznesowych

> Jedyne źródło prawdy o regułach `BR-xx`: opis, przykłady, kod błędu, miejsce implementacji i testy. Czytaj przy każdej pracy nad logiką (sesje `API`) i przed obroną.
> ID reguły umieszczaj w nazwie testu (`it('BR-01: …')`) i w komentarzu przy implementacji (`// BR-01`). Format błędu: [api-conventions.md](api-conventions.md#format-błędu).

## Podsumowanie

| ID | Reguła (skrót) | HTTP | `code` | Warstwa |
|-|-|-|-|-|
| [BR-01](#br-01) | Rezerwacje i blokady pokoju nie nakładają się | 409 | `RESERVATION_OVERLAP` | domain + application (transakcja) + DB |
| [BR-02](#br-02) | Liczba gości ≤ pojemność | 422 | `CAPACITY_EXCEEDED` | domain |
| [BR-03](#br-03) | Minimalna liczba nocy | 422 | `MIN_NIGHTS_NOT_MET` | domain |
| [BR-04](#br-04) | Poprawne daty pobytu | 422 | `INVALID_STAY_DATES` | domain |
| [BR-05](#br-05) | Cenę liczy serwer i zamraża ją | – | – | domain |
| [BR-06](#br-06) | Przejścia statusu zgodne z maszyną stanów | 409 | `INVALID_STATUS_TRANSITION` | domain |
| [BR-07](#br-07) | `PENDING` wygasa po `pendingExpiryHours` | – | – | application (scheduler) |
| [BR-08](#br-08) | Termin anulowania przez gościa | 422 | `CANCELLATION_DEADLINE_PASSED` | domain |
| [BR-09](#br-09) | Stawki sezonowe pokoju nie nakładają się | 409 | `SEASONAL_RATE_OVERLAP` | domain + application + DB |
| [BR-10](#br-10) | Brak usuwania i dezaktywacji z przyszłymi rezerwacjami; soft delete | 409 | `HAS_FUTURE_RESERVATIONS` | application |
| [BR-11](#br-11) | Optimistic locking edycji rezerwacji | 409 | `VERSION_CONFLICT` | application + infrastructure |
| [BR-12](#br-12) | Izolacja danych właścicieli | 404 / 403 | `NOT_FOUND` / `FORBIDDEN` | application (polityka) + guard |
| [BR-13](#br-13) | Rezerwacja tylko aktywnego pokoju w aktywnym obiekcie | 422 | `ROOM_NOT_BOOKABLE` | domain |

## Zakres reguł wg źródła rezerwacji

Decyzja: [Q-01](../open-questions.md#q-01) (zdecydowane 2026-10-09, zgodnie z rekomendacją).

| Reguła | `ONLINE` (gość) | `MANUAL` (właściciel/admin) |
|-|-|-|
| BR-01, BR-02, BR-13 | ✔ | ✔ zawsze |
| BR-03 | ✔ | ✔, chyba że `ignoreMinNights: true` |
| BR-04 | ✔ | ✔, ale przyjazd w przeszłości dozwolony (maks. 30 dni wstecz) |
| BR-05 | ✔ | ✔ (właściciel nie podaje ceny) |
| BR-07 | ✔ | nie dotyczy (od razu `CONFIRMED`) |
| BR-08 | ✔ | nie dotyczy |

## BR-01

**Rezerwacje pokoju nie mogą się nakładać.** Kolizję tworzą rezerwacje w statusie `PENDING` lub `CONFIRMED` oraz blokady terminów.

- Przykład: rezerwacja `[14.08, 18.08)` koliduje z `[17.08, 20.08)`. Nie koliduje z `[18.08, 21.08)`, bo dzień wyjazdu może być dniem przyjazdu kolejnego gościa.
- Przykład: blokada nocy `10.08–12.08` koliduje z pobytem `[12.08, 14.08)`, a nie koliduje z `[13.08, 15.08)`.
- Implementacja (3 poziomy obrony):
  1. `common/domain/stay-range.ts`: czyste funkcje `overlaps(stayA, stayB)` i `overlapsBlock(stay, block)`,
  2. `modules/reservations/application/reservations.service.ts`: w transakcji `SELECT … FROM rooms WHERE id = $1 FOR UPDATE`, potem `findCollisions(roomId, range, excludeReservationId?)` w repozytorium,
  3. PostgreSQL: `EXCLUDE USING gist` ([data-model.md](data-model.md#reservation-rezerwacja)). Naruszenie (`23P01`) repozytorium tłumaczy na `ReservationOverlapError`.
- Dotyczy też zmiany dat lub pokoju w `PATCH` oraz tworzenia blokady na zajęty termin (`BLOCK_OVERLAPS_RESERVATION`, 409, [Q-15](../open-questions.md#q-15)).
- Testy: unit `stay-range.spec.ts` (nakładanie, styk dni, blokady włącznie); integracja `reservations.e2e-spec.ts` (drugi `POST` na ten sam termin → 409; dwa równoległe żądania → dokładnie jedno 201).

## BR-02

**Liczba gości nie może przekroczyć pojemności pokoju.** Przykład: `capacity = 4`, `guestsCount = 5` → 422.

- Implementacja: `modules/reservations/domain/reservation-policy.ts` → `assertCapacity(room, guestsCount)`. Sprawdzane także w `PATCH` przy zmianie `guestsCount` lub pokoju.
- Testy: unit `reservation-policy.spec.ts`.

## BR-03

**Pobyt trwa co najmniej `minNights`.** Wartość pochodzi ze stawki sezonowej obejmującej **noc przyjazdu** (jeśli ma `minNights`), w przeciwnym razie z pokoju.

- Przykład: pokój `minNights = 1`, „Wysoki sezon” 01.07–31.08 z `minNights = 3`. Pobyt `[14.08, 16.08)` (2 noce) → 422; pobyt `[30.06, 02.07)` → OK (noc przyjazdu poza sezonem).
- Implementacja: `modules/pricing/domain/min-nights.ts` → `resolveMinNights(room, rates, checkIn)`, `assertMinNights(...)`.
- `details`: `{ "minNights": 3 }`, żeby UI mogło pokazać „Minimalny pobyt w sezonie: 3 noce”.
- Testy: unit `min-nights.spec.ts` (cena bazowa, sezon, sezon bez `minNights`).

## BR-04

**Poprawne daty pobytu:** przyjazd nie wcześniej niż dziś (`Clock`, `Europe/Warsaw`), wyjazd po przyjeździe, przyjazd maks. 365 dni naprzód, pobyt maks. 30 nocy.

- `details.reason`: `CHECK_IN_IN_PAST`, `CHECK_OUT_NOT_AFTER_CHECK_IN`, `CHECK_IN_TOO_FAR`, `STAY_TOO_LONG`.
- Implementacja: `common/domain/stay-range.ts` → `assertStayDates(range, today, options)`.
- Testy: unit `stay-range.spec.ts` z ustalonym „dziś” (wszystkie 4 przypadki + granice: dziś, 365 dni, 30 nocy).

## BR-05

**Cenę liczy wyłącznie serwer** jako sumę cen za każdą noc `[checkIn, checkOut)`: stawka sezonowa obejmująca daną noc albo `basePricePerNight`. Cena jest zapisywana w rezerwacji (`totalPrice`, `priceBreakdown`) i nie zmienia się po zmianie cennika. Klient nigdy nie przesyła ceny.

- Przykład: base 370 zł, sezon od 16.08 450 zł; pobyt `[14.08, 18.08)` = 370 + 370 + 450 + 450 = **1 640 zł** (`164000`).
- Implementacja: `modules/pricing/domain/calculate-price.ts` → `calculatePrice(range, basePrice, rates) → { total, breakdown[] }`. DTO wejściowe nie mają pól ceny, a `forbidNonWhitelisted` odrzuca je z 400.
- Testy: unit `calculate-price.spec.ts` (tylko base, tylko sezon, przełom sezonu); integracja: zmiana stawki po utworzeniu nie zmienia `totalPrice`.

## BR-06

**Zmiany statusu tylko zgodnie z maszyną stanów** ([data-model.md](data-model.md#maszyna-stanów-rezerwacji)). Niedozwolone przejście → 409.

- Implementacja: `modules/reservations/domain/reservation-status.ts`: tabela przejść `{ from, to, actors[] }` i `assertTransition(from, to, actor)`. Zapis warunkowy `UPDATE … WHERE status = :from` chroni przed wyścigiem (np. jednoczesne potwierdzenie i wygaśnięcie).
- `details`: `{ "from": "CANCELLED", "to": "CONFIRMED" }`.
- Testy: unit `reservation-status.spec.ts` (wszystkie dozwolone i przykładowe niedozwolone przejścia, uprawnienia aktorów); integracja: `confirm` anulowanej → 409.

## BR-07

**Niepotwierdzona rezerwacja wygasa** po `pendingExpiryHours` i zwalnia termin.

- Implementacja: `modules/reservations/domain/reservation-status.ts` → `isExpired(reservation, now)`; job `ExpirePendingReservationsJob` co 15 min ([async-and-jobs.md](async-and-jobs.md#scheduler)). Masowy zapis warunkowy `WHERE status = 'PENDING' AND expires_at <= now`, a następnie zdarzenie `ReservationExpired` dla każdej rezerwacji. `confirm` po `expiresAt` → 409 `INVALID_STATUS_TRANSITION`, nawet jeśli job jeszcze nie przeszedł.
- Testy: unit `isExpired`; integracja: job z fałszywym zegarem zmienia status na `EXPIRED`, a termin staje się dostępny.

## BR-08

**Gość może anulować potwierdzoną rezerwację** najpóźniej `cancellationDeadlineDays` dni przed przyjazdem. Później anulować może tylko właściciel lub admin. Rezerwację `PENDING` gość może anulować zawsze.

- Przykład: przyjazd 14.08, `cancellationDeadlineDays = 7` → gość anuluje do **07.08 włącznie**.
- Implementacja: `modules/reservations/domain/cancellation-policy.ts` → `guestCancellationDeadline(checkIn, days)`, `assertGuestCanCancel(reservation, property, today)`. Termin trafia też do DTO publicznego (`cancellableUntil`), żeby UI (P5) go pokazało.
- Testy: unit `cancellation-policy.spec.ts` (w dniu terminu, dzień po, `PENDING`).

## BR-09

**Stawki sezonowe jednego pokoju nie mogą się nakładać** (zakresy nocy włącznie).

- Przykład: „Wysoki sezon” 01.07–31.08 i „Sierpień” 01.08–15.08 → 409, `details: { "conflictingRateId", "conflictingRateName" }`.
- Implementacja: `common/domain/date-range.ts` → `inclusiveRangesOverlap`; `modules/pricing/application/rates.service.ts` sprawdza przy `POST` i `PATCH`; w DB `EXCLUDE` ([data-model.md](data-model.md#seasonalrate-stawka-sezonowa)).
- Testy: unit `date-range.spec.ts`; integracja: drugi nakładający się `POST /rooms/:id/rates` → 409.

## BR-10

**Nie można usunąć ani dezaktywować pokoju ani obiektu z przyszłymi aktywnymi rezerwacjami** (`PENDING`/`CONFIRMED` z `checkOut > today`). Usuwanie jest miękkie (`deletedAt`).

- Implementacja: `modules/rooms/application/rooms.service.ts` i `modules/properties/application/properties.service.ts` przed `DELETE` oraz `PATCH { isActive: false }` wywołują `reservationsRepository.countFutureActive(...)`; `details: { "count": 3 }`.
- Testy: integracja `rooms.e2e-spec.ts` (`DELETE` pokoju z rezerwacją → 409; bez rezerwacji → 204 i pokój znika z list).

## BR-11

**Edycja rezerwacji używa optimistic locking.** `PATCH /reservations/:id` wymaga pola `version`. Nieaktualna wersja → 409.

- Implementacja: repozytorium wykonuje `UPDATE … WHERE id = :id AND version = :version` i ustawia `version = version + 1`. Gdy zmieniono 0 wierszy, rzuca `VersionConflictError`. Odpowiedź zawiera nową `version`.
- UI pokazuje „Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane”.
- Testy: unit serwisu z fake repo; integracja: dwa `PATCH` z tą samą `version` → 200, potem 409.

## BR-12

**Izolacja danych:** właściciel widzi i modyfikuje tylko zasoby swoich obiektów. Cudzy zasób → **404**, żeby nie ujawniać, że istnieje. Brak roli (np. `OWNER` na `/admin/**`) → **403**.

- Implementacja: `RolesGuard` + `@Roles()` (403); w `application/` polityka `OwnershipPolicy` i zapytania z filtrem `ownerId` ([ADR 0008](../decisions/0008-multi-tenancy-ownership.md)). `ADMIN` omija filtr.
- Testy: integracja `isolation.e2e-spec.ts` (owner B: `GET /reservations/:idA` → 404, `PATCH /rooms/:idA` → 404, lista bez cudzych danych; `OWNER` → `GET /admin/owners` → 403).

## BR-13

**Rezerwować można tylko aktywny pokój w aktywnym obiekcie** (`isActive = true`, `deletedAt = null` dla obu).

- Strona publiczna nieaktywnego obiektu zwraca 404, a dostępność pomija nieaktywne pokoje.
- Implementacja: `modules/reservations/domain/reservation-policy.ts` → `assertBookable(room, property)`.
- Testy: unit `reservation-policy.spec.ts`; integracja: rezerwacja nieaktywnego pokoju → 422.
