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
| `POST` | `/reservations/:id/cancel` | `OWNER`, `ADMIN` | `{ reason? }` (≤ 500 lub `null`) | `200` `ReservationDto` | `409 INVALID_STATUS_TRANSITION` |

`INVALID_STATUS_TRANSITION` ma `details: { from, to }`; `confirm` po `expiresAt` dodaje `expired: true` (BR-07), a równoległa zmiana statusu `concurrent: true`. Cudza rezerwacja, nieistniejący pokój lub gość obiektu → 404 (BR-12).

**Query `GET /reservations`**: `page`, `pageSize`, `propertyId`, `roomId`, `status` (lista po przecinku), `source`, `from`, `to` (pobyt ma noc w `[from, to]`: `checkIn ≤ to`, `checkOut > from`), `q` (nazwisko, e-mail gościa, numer; 2–100 znaków), `sort` (`checkIn`, `createdAt`, `number`, `totalPrice`; domyślnie `checkIn:asc`). `OWNER` widzi tylko rezerwacje swoich obiektów (BR-12): cudze `propertyId` daje pustą listę. Rezerwacje usuniętych obiektów są ukryte.

**`CreateManualReservationDto`**:

| Pole | Walidacja |
|-|-|
| `roomId` | UUID pokoju z tego obiektu (inaczej 404) |
| `checkIn`, `checkOut` | `YYYY-MM-DD` |
| `guestsCount` | int 1–99 |
| `guest` | `{ id }` istniejącego gościa obiektu **albo** `{ firstName, lastName, email?, phone? }` ([Q-03](../open-questions.md#q-03)); `id` razem z danymi → 400 |
| `guestNotes`, `internalNotes` | ≤ 2000 |
| `ignoreMinNights` | bool, domyślnie `false` ([Q-01](../open-questions.md#q-01)) |

Gość podany danymi: gdy istnieje gość obiektu z tym e-mailem, rekord jest aktualizowany ([Q-04](../open-questions.md#q-04)), w przeciwnym razie powstaje nowy. Brak ceny w DTO (BR-05).

Rezerwacja ręczna podlega BR-04 z przyjazdem do 30 dni wstecz ([Q-01](../open-questions.md#q-01)). Numer `KL-RRRR-NNNNNN` z licznika roku według „dziś” w `Europe/Warsaw` ([Q-12](../open-questions.md#q-12)); odrzucona rezerwacja nie zużywa numeru (rollback).

**`UpdateReservationDto`** ([Q-02](../open-questions.md#q-02)): `version` (wymagane, BR-11), `internalNotes?`, `guestNotes?`, `guestsCount?`, `roomId?`, `checkIn?`, `checkOut?`, `ignoreMinNights?` (tylko rezerwacje `MANUAL`, [Q-01](../open-questions.md#q-01); dla `ONLINE` ignorowane).

- `internalNotes` można zmieniać w każdym statusie.
- Pozostałe pola tylko dla `PENDING`/`CONFIRMED` z `checkIn ≥ today`, w przeciwnym razie 409 `RESERVATION_NOT_EDITABLE`.
- Zmiana dat lub pokoju uruchamia ponownie BR-01…05 i BR-13 (bez kolizji z samą sobą) i **przelicza cenę według aktualnego cennika**. BR-04 bez wyjątku Q-01 (przyjazd nie wcześniej niż dziś). Pokój musi należeć do tego samego obiektu.
- Zmiana samej liczby gości sprawdza tylko BR-02; cena się nie zmienia.
- Liczą się tylko pola, które rzeczywiście się zmieniają: `PATCH` bez zmian nie podnosi `version` i nie dodaje historii. Każdy zapis (także `confirm` i `cancel`) podnosi `version`.

**`ReservationListItemDto`**: `id`, `number`, `propertyId`, `room: { id, name }`, `guest: { id, firstName, lastName, email }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `status`, `source`, `expiresAt`, `createdAt`.
**`ReservationDto`**: jak lista + `guest.phone`, `priceBreakdown: [{ date, price }]`, `guestNotes`, `internalNotes`, `confirmedAt`, `cancelledAt`, `cancelledBy`, `cancellationReason`, `version`, `events: [{ type, actorType, actorName, createdAt, payload }]` (od najstarszych; `actorName` dla `OWNER`/`ADMIN`, `payload`: `CREATED` `{ source, status }`, `UPDATED` `{ fields }`, `CANCELLED` `{ reason }`), `updatedAt`.

## 6. Backend: zadania

- [x] Domena: `reservation-status.ts` (tabela przejść, `assertTransition`, `assertConfirmable`, `isExpired`), `reservation-policy.ts` (`assertCapacity`, `assertBookable`, od M6), `reservation-number.ts` (`formatReservationNumber`), `editing-policy.ts` (`assertEditable`, Q-02).
- [x] `ReservationsService.createManual`: transakcja → `FOR UPDATE` pokoju → `AvailabilityService` (tryb assert) → upsert gościa → numer z `ReservationCounter` → insert `CONFIRMED` → `ReservationEvent(CREATED)` → po commicie `ReservationCreated` (`EVENT_BUS`; e-mail do gościa z adresem).
- [x] `confirm` i `cancel`: zapis warunkowy po statusie, `ReservationEvent` (`cancelledBy` = rola aktora), po commicie `ReservationConfirmed` i `ReservationCancelled`.
- [x] `update`: BR-11 (`WHERE version = :v`), ponowna walidacja przy zmianie dat, pokoju lub liczby gości (zamki obu pokoi w stałej kolejności), `ReservationEvent(UPDATED)` z listą zmienionych pól.
- [x] Mapowanie `23P01` (EXCLUDE) → `ReservationOverlapError` w repozytorium.
- [x] Lista z filtrami, wyszukiwaniem (`ILIKE` po `guest.lastName`, `guest.email`, `number`) i sortowaniem z białej listy; indeksy z [data-model.md](../architecture/data-model.md#reservation-rezerwacja).
- [x] `ReservationsQueryService.countFutureActive(roomId | propertyId)` dla BR-10 (od M5).

## 7. Frontend: ekrany i zadania

Ekrany: O4 (lista + drawer), O5 (nowa rezerwacja ręczna), O2 (akcje na pulpicie): [screens.md](../../apps/web/docs/screens.md).

- [x] `/panel/rezerwacje`: filtry (wyszukiwarka z debounce, statusy multi-select, pokój, zakres „Pobyt od–do”, „Wyczyść filtry”) zsynchronizowane z URL (`useSearchParams`).
- [x] Tabela: „Numer”, „Gość”, „Pokój”, „Przyjazd”, „Wyjazd”, „Noce”, „Goście”, „Kwota”, „Status” (badge), „Źródło”; paginacja „1–20 z 134” + wybór rozmiaru strony.
- [x] Drawer szczegółów (`/panel/rezerwacje/:id`): kontakt gościa, pobyt, rozbicie ceny, uwagi gościa, edytowalna „Notatka wewnętrzna”, historia (timeline z `events`), akcje „Potwierdź”, „Edytuj” (dialog: termin, pokój, liczba gości, uwagi; cena z `quote` z `excludeReservationId`), „Anuluj rezerwację” (dialog z powodem). Dla `PENDING` „Anuluj” ma etykietę „Odrzuć”. Drawer otwierany także z pulpitu i kalendarza.
- [x] Toast „Rezerwacja została potwierdzona”; `VERSION_CONFLICT` → alert „Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane” z przyciskiem odświeżenia.
- [x] Dialog O5 „Nowa rezerwacja”: pokój, zakres dat (zajęte dni wyłączone na podstawie kalendarza), goście, autocomplete gościa (`GET /properties/:id/guests?q=`), notatka; „Cena wyliczona” z `GET /rooms/:id/quote`; kolizja inline z numerem rezerwacji; informacja „Rezerwacja ręczna jest od razu potwierdzona”.
- [x] Po mutacjach unieważnij zapytania: lista, szczegóły, kalendarz, pulpit (`invalidateReservations` w `shared/lib/invalidate.ts`).

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Tabela przejść: wszystkie dozwolone, przykładowe niedozwolone, aktorzy | unit | BR-06 |
| `isExpired` na granicy `expiresAt` | unit | BR-07 |
| `assertCapacity`, `assertBookable` | unit | BR-02, BR-13 |
| `ReservationNumber.format(2026, 123)` → `KL-2026-000123` | unit | – |
| Ręczna rezerwacja → 201 `CONFIRMED`, cena z serwera | int | BR-05 |
| Ręczna rezerwacja na zajęty termin (rezerwacja lub blokada) → 409; trzy równoległe → jedna 201, bez zużytych numerów | int | BR-01 |
| `confirm` po `expiresAt` → 409; anulowanie z powodem zwalnia termin | int | BR-06, BR-07 |
| `PATCH` dat: nowa cena wg cennika; przeniesienie na zajęty pokój → 409; przeszła rezerwacja → tylko `internalNotes` | int | BR-01, BR-05, Q-02 |
| Gość: upsert po e-mailu, nowy bez e-maila, `{ id }` innego obiektu → 404 | int | Q-03, Q-04, BR-12 |
| `confirm` anulowanej → 409 | int | BR-06 |
| `PATCH` ze starą `version` → 409 `VERSION_CONFLICT` | int | BR-11 |
| Owner B → `GET /reservations/:idA` → 404; lista bez cudzych rezerwacji | int | BR-12 |
| Filtry: `status`, `q`, `from`/`to` | int | – |
| Drawer: alert konfliktu wersji, akcje zależne od statusu | ui | BR-06, BR-11 |

## 9. Kryteria akceptacji

- [x] Potwierdzenie `PENDING` zmienia status, zapisuje historię i wysyła e-mail do gościa (M9).
- [ ] Rezerwacja ręczna jest od razu `CONFIRMED` i widoczna w kalendarzu.
- [ ] Dwie karty przeglądarki edytujące tę samą rezerwację: druga dostaje czytelny komunikat konfliktu.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M7, zdarzenia i e-maile: M9) |
| UI | Gotowe (M11) |

Zdecydowane: [Q-01](../open-questions.md#q-01), [Q-02](../open-questions.md#q-02), [Q-03](../open-questions.md#q-03), [Q-04](../open-questions.md#q-04), [Q-05](../open-questions.md#q-05), [Q-12](../open-questions.md#q-12).
