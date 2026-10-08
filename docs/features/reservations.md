# Funkcjonalność: Rezerwacje (panel)

> Lista, szczegóły, edycja, potwierdzanie i anulowanie rezerwacji przez właściciela lub admina oraz rezerwacja ręczna (telefoniczna).
> Etapy: M7 (API), M11 (UI). Maszyna stanów: [data-model.md](../architecture/data-model.md#maszyna-stanów-rezerwacji). Proces gościa: [guest-booking.md](guest-booking.md).

## 1. Cel i wartość dla użytkownika

Właściciel ma wszystkie rezerwacje w jednym miejscu: szuka, filtruje, potwierdza lub odrzuca prośby gości, dodaje rezerwacje telefoniczne i prowadzi notatki. System pilnuje kolizji, stanów i jednoczesnych edycji.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę filtrować rezerwacje po statusie, pokoju i datach oraz szukać po nazwisku, e-mailu lub numerze.
- Jako **właściciel** chcę potwierdzić lub odrzucić rezerwację oczekującą, aby gość dostał odpowiedź e-mailem.
- Jako **właściciel** chcę dodać rezerwację telefoniczną, która od razu jest potwierdzona.
- Jako **właściciel** chcę dopisać notatkę wewnętrzną, której gość nie widzi.
- Jako **właściciel** chcę wiedzieć, że ktoś inny zmienił rezerwację w międzyczasie, zamiast nadpisać jego zmiany.

## 3. Reguły biznesowe

[BR-01](../architecture/business-rules.md#br-01), [BR-02](../architecture/business-rules.md#br-02), [BR-03](../architecture/business-rules.md#br-03), [BR-04](../architecture/business-rules.md#br-04), [BR-05](../architecture/business-rules.md#br-05), [BR-06](../architecture/business-rules.md#br-06), [BR-07](../architecture/business-rules.md#br-07), [BR-11](../architecture/business-rules.md#br-11), [BR-12](../architecture/business-rules.md#br-12), [BR-13](../architecture/business-rules.md#br-13). Zakres reguł dla rezerwacji ręcznej: [business-rules.md](../architecture/business-rules.md#zakres-reguł-wg-źródła-rezerwacji).

## 4. Model danych

[Reservation](../architecture/data-model.md#reservation-rezerwacja), [ReservationEvent](../architecture/data-model.md#reservationevent-historia-rezerwacji-q-05), [Guest](../architecture/data-model.md#guest-gość), [ReservationCounter](../architecture/data-model.md#reservationcounter-q-12).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/reservations` | `OWNER`, `ADMIN` | query poniżej | `200` `Paginated<ReservationListItemDto>` | `400` |
| `POST` | `/properties/:id/reservations` | `OWNER`, `ADMIN` | `CreateManualReservationDto` | `201` `ReservationDto` + `Location` | `409 RESERVATION_OVERLAP`, `422 CAPACITY_EXCEEDED`/`MIN_NIGHTS_NOT_MET`/`INVALID_STAY_DATES`/`ROOM_NOT_BOOKABLE` |
| `GET` | `/reservations/:id` | `OWNER`, `ADMIN` | – | `200` `ReservationDto` | `404` |
| `PATCH` | `/reservations/:id` | `OWNER`, `ADMIN` | `UpdateReservationDto` | `200` `ReservationDto` | `409 VERSION_CONFLICT`, `409 RESERVATION_OVERLAP`, `409 RESERVATION_NOT_EDITABLE`, `422 …` |
| `POST` | `/reservations/:id/confirm` | `OWNER`, `ADMIN` | – | `200` `ReservationDto` | `409 INVALID_STATUS_TRANSITION` |
| `POST` | `/reservations/:id/cancel` | `OWNER`, `ADMIN` | `{ reason? }` (≤ 500) | `200` `ReservationDto` | `409 INVALID_STATUS_TRANSITION` |

**Query `GET /reservations`**: `page`, `pageSize`, `propertyId`, `roomId`, `status` (lista po przecinku), `source`, `from`, `to` (pobyt przecina `[from, to]`), `q` (nazwisko, e-mail gościa, numer), `sort` (`checkIn`, `createdAt`, `number`, `totalPrice`; domyślnie `checkIn:asc`). `OWNER` widzi tylko rezerwacje swoich obiektów (BR-12).

**`CreateManualReservationDto`**:

| Pole | Walidacja |
|-|-|
| `roomId` | UUID pokoju z tego obiektu (inaczej 404) |
| `checkIn`, `checkOut` | `YYYY-MM-DD` |
| `guestsCount` | int ≥ 1 |
| `guest` | `{ id }` istniejącego gościa obiektu **albo** `{ firstName, lastName, email?, phone? }` ([Q-03](../open-questions.md#q-03)) |
| `guestNotes`, `internalNotes` | ≤ 2000 |
| `ignoreMinNights` | bool, domyślnie `false` ([Q-01](../open-questions.md#q-01)) |

Gość podany danymi: gdy istnieje gość obiektu z tym e-mailem, rekord jest aktualizowany ([Q-04](../open-questions.md#q-04)), w przeciwnym razie powstaje nowy. Brak ceny w DTO (BR-05).

**`UpdateReservationDto`** ([Q-02](../open-questions.md#q-02)): `version` (wymagane, BR-11), `internalNotes?`, `guestNotes?`, `guestsCount?`, `roomId?`, `checkIn?`, `checkOut?`.

- `internalNotes` można zmieniać w każdym statusie.
- Pozostałe pola tylko dla `PENDING`/`CONFIRMED` z `checkIn ≥ today`, w przeciwnym razie 409 `RESERVATION_NOT_EDITABLE`.
- Zmiana dat lub pokoju uruchamia ponownie BR-01…05 i BR-13 (bez kolizji z samą sobą) i **przelicza cenę według aktualnego cennika**.

**`ReservationListItemDto`**: `id`, `number`, `propertyId`, `room: { id, name }`, `guest: { id, firstName, lastName, email }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `status`, `source`, `expiresAt`, `createdAt`.
**`ReservationDto`**: jak lista + `guest.phone`, `priceBreakdown`, `guestNotes`, `internalNotes`, `confirmedAt`, `cancelledAt`, `cancelledBy`, `cancellationReason`, `version`, `events: [{ type, actorType, actorName?, createdAt, payload? }]`, `updatedAt`.

## 6. Backend: zadania

- [ ] Domena: `reservation-status.ts` (tabela przejść, `assertTransition`, `isExpired`), `reservation-policy.ts` (`assertCapacity`, `assertBookable`), `ReservationNumber` (format `KL-RRRR-NNNNNN`).
- [ ] `ReservationsService.createManual`: transakcja → `FOR UPDATE` pokoju → `AvailabilityService` (tryb assert) → upsert gościa → numer z `ReservationCounter` → insert `CONFIRMED` → `ReservationEvent(CREATED)` → po commicie `ReservationCreated`.
- [ ] `confirm` i `cancel`: zapis warunkowy po statusie, `ReservationEvent`, zdarzenia `ReservationConfirmed` i `ReservationCancelled` (`cancelledBy` = rola aktora).
- [ ] `update`: BR-11 (`WHERE version = :v`), ponowna walidacja przy zmianie dat, pokoju lub liczby gości, `ReservationEvent(UPDATED)` z listą zmienionych pól.
- [ ] Mapowanie `23P01` (EXCLUDE) → `ReservationOverlapError` w repozytorium.
- [ ] Lista z filtrami, wyszukiwaniem (`ILIKE` po `guest.lastName`, `guest.email`, `number`) i sortowaniem z białej listy; indeksy z [data-model.md](../architecture/data-model.md#reservation-rezerwacja).
- [ ] `ReservationsQueryPort.countFutureActive(roomId | propertyId)` dla BR-10.

## 7. Frontend: ekrany i zadania

Ekrany: O4 (lista + drawer), O5 (nowa rezerwacja ręczna), O2 (akcje na pulpicie): [screens.md](../../apps/web/docs/screens.md).

- [ ] `/panel/rezerwacje`: filtry (wyszukiwarka z debounce, statusy multi-select, pokój, zakres „Pobyt od–do”, „Wyczyść filtry”) zsynchronizowane z URL (`useSearchParams`).
- [ ] Tabela: „Numer”, „Gość”, „Pokój”, „Przyjazd”, „Wyjazd”, „Noce”, „Goście”, „Kwota”, „Status” (badge), „Źródło”; paginacja „1–20 z 134” + wybór rozmiaru strony.
- [ ] Drawer szczegółów (`/panel/rezerwacje/:id`): kontakt gościa, pobyt, rozbicie ceny, uwagi gościa, edytowalna „Notatka wewnętrzna”, historia (timeline z `events`), akcje „Potwierdź”, „Edytuj”, „Anuluj rezerwację” (dialog z powodem). Dla `PENDING` „Anuluj” ma etykietę „Odrzuć”.
- [ ] Toast „Rezerwacja została potwierdzona”; `VERSION_CONFLICT` → alert „Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane” z przyciskiem odświeżenia.
- [ ] Dialog O5 „Nowa rezerwacja”: pokój, zakres dat (zajęte dni wyłączone na podstawie kalendarza), goście, autocomplete gościa (`GET /properties/:id/guests?q=`), notatka; „Cena wyliczona” z `GET /rooms/:id/quote`; kolizja inline z numerem rezerwacji; informacja „Rezerwacja ręczna jest od razu potwierdzona”.
- [ ] Po mutacjach unieważnij zapytania: lista, szczegóły, kalendarz, pulpit.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Tabela przejść: wszystkie dozwolone, przykładowe niedozwolone, aktorzy | unit | BR-06 |
| `isExpired` na granicy `expiresAt` | unit | BR-07 |
| `assertCapacity`, `assertBookable` | unit | BR-02, BR-13 |
| `ReservationNumber.format(2026, 123)` → `KL-2026-000123` | unit | – |
| Ręczna rezerwacja → 201 `CONFIRMED`, cena z serwera | int | BR-05 |
| Ręczna rezerwacja na zajęty termin → 409; równoległe → jedna 201 | int | BR-01 |
| `confirm` anulowanej → 409 | int | BR-06 |
| `PATCH` ze starą `version` → 409 `VERSION_CONFLICT` | int | BR-11 |
| Owner B → `GET /reservations/:idA` → 404; lista bez cudzych rezerwacji | int | BR-12 |
| Filtry: `status`, `q`, `from`/`to` | int | – |
| Drawer: alert konfliktu wersji, akcje zależne od statusu | ui | BR-06, BR-11 |

## 9. Kryteria akceptacji

- [ ] Potwierdzenie `PENDING` zmienia status, zapisuje historię i wysyła e-mail do gościa (M9).
- [ ] Rezerwacja ręczna jest od razu `CONFIRMED` i widoczna w kalendarzu.
- [ ] Dwie karty przeglądarki edytujące tę samą rezerwację: druga dostaje czytelny komunikat konfliktu.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | Nie rozpoczęto |

Otwarte: [Q-01](../open-questions.md#q-01), [Q-02](../open-questions.md#q-02), [Q-03](../open-questions.md#q-03), [Q-04](../open-questions.md#q-04), [Q-05](../open-questions.md#q-05), [Q-12](../open-questions.md#q-12).
