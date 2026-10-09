# Funkcjonalność: Goście

> Baza gości obiektu: lista z wyszukiwaniem, autouzupełnianie w rezerwacji ręcznej i zasady tworzenia lub aktualizacji gościa.
> Etapy: M7 (API), M11 (UI).

## 1. Cel i wartość dla użytkownika

Właściciel ma listę swoich gości z historią pobytów. Przy rezerwacji telefonicznej powracającego gościa nie musi wpisywać danych od nowa. Dane gości są odizolowane między obiektami (RODO, BR-12).

## 2. Historyjki użytkownika

- Jako **właściciel** chcę przeglądać i przeszukiwać listę gości mojego obiektu.
- Jako **właściciel** chcę przy rezerwacji ręcznej wyszukać gościa po nazwisku lub e-mailu i wybrać go z listy.
- Jako **gość** rezerwujący ponownie nie chcę, żeby powstawały duplikaty moich danych.

## 3. Reguły biznesowe

- [BR-12](../architecture/business-rules.md#br-12): goście są przypisani do obiektu; właściciel widzi tylko gości swoich obiektów.
- Tworzenie i aktualizacja gościa: [Q-03](../open-questions.md#q-03) (e-mail opcjonalny dla `MANUAL`), [Q-04](../open-questions.md#q-04) (aktualizacja danych przy ponownej rezerwacji).

## 4. Model danych

[Guest](../architecture/data-model.md#guest-gość) (`UNIQUE(propertyId, email)`), [Reservation](../architecture/data-model.md#reservation-rezerwacja).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/properties/:id/guests` | `OWNER`, `ADMIN` | query: `page`, `pageSize`, `q` (imię, nazwisko, e-mail, telefon; min. 2 znaki), `sort` (`lastName`, `createdAt`, `lastStayAt`; domyślnie `lastName:asc`) | `200` `Paginated<GuestListItemDto>` | `404` |

- `GuestListItemDto`: `id`, `firstName`, `lastName`, `email`, `phone`, `reservationsCount` (wszystkie rezerwacje gościa w obiekcie, w każdym statusie), `lastStayAt` (najpóźniejszy `checkIn` rezerwacji `CONFIRMED`/`COMPLETED` lub `null`), `createdAt`.
- Sort `lastStayAt`: goście bez pobytu zawsze na końcu (`NULLS LAST`). `%` i `_` w `q` są traktowane dosłownie.
- Gości nie tworzy się osobnym endpointem. Powstają przy rezerwacji online ([guest-booking.md](guest-booking.md)) lub ręcznej ([reservations.md](reservations.md)).
- Edycja i usuwanie gościa (RODO) są poza MVP ([Q-18](../open-questions.md#q-18)).

## Zasady upsertu gościa (application)

`GuestsService.resolveForReservation(propertyId, input)` w transakcji rezerwacji:

| Wejście | Działanie |
|-|-|
| `{ id }` (tylko `MANUAL`) | gość musi należeć do obiektu, inaczej 404 |
| dane z e-mailem | e-mail małymi literami; atomowy upsert `INSERT … ON CONFLICT (property_id, email) DO UPDATE`: aktualizuje `firstName`, `lastName` i `phone`, gdy podano nowy ([Q-04](../open-questions.md#q-04)); gdy nie ma gościa, tworzy go |
| dane bez e-maila (tylko `MANUAL`) | zawsze utwórz nowego gościa |

## 6. Backend: zadania

- [x] Moduł `guests`: `GuestsController`, `GuestsService` (lista, `resolveForReservation`), `GuestsRepository`.
- [x] Wyszukiwanie `ILIKE` po wielu polach; indeks `(propertyId, lastName)`.
- [x] `reservationsCount` i `lastStayAt` jednym zapytaniem z agregacją.
- [x] Obsługa wyścigu przy upsercie: `ON CONFLICT DO UPDATE` zamiast łapania `P2002`, bo błąd wewnątrz transakcji rezerwacji przerwałby całą transakcję w PostgreSQL.

## 7. Frontend: ekrany i zadania

Ekran `/panel/goscie` nie ma projektu w Stitch, więc użyj wzorca tabeli z O4: [screens.md](../../apps/web/docs/screens.md).

- [x] `/panel/goscie`: tabela („Gość”, „E-mail”, „Telefon”, „Rezerwacje”, „Ostatni pobyt”), wyszukiwarka, paginacja; kliknięcie gościa → lista rezerwacji przefiltrowana `q=<email>`.
- [x] Komponent `GuestAutocomplete` dla O5 (debounce 300 ms, min. 2 znaki, opcja „Dodaj nowego gościa”).
- [x] Stan pusty: „Nie masz jeszcze gości – pojawią się tu po pierwszej rezerwacji”.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Ponowna rezerwacja z tym samym e-mailem nie tworzy duplikatu i aktualizuje dane | int | – |
| Ten sam e-mail w dwóch obiektach → dwa rekordy | int | BR-12 |
| Owner B → `GET /properties/:idA/guests` → 404 | int | BR-12 |
| `resolveForReservation` z `{ id }` gościa innego obiektu → 404 (przez `POST /properties/:id/reservations`) | int | BR-12 |
| Sort `lastStayAt` (bez pobytu na końcu), `reservationsCount`, wyszukiwanie po telefonie | int | – |
| Wyszukiwanie `q` po nazwisku i e-mailu | int | – |
| `GuestAutocomplete`: debounce, wybór, „Dodaj nowego” | ui | – |

## 9. Kryteria akceptacji

- [ ] Lista gości ma paginację i wyszukiwanie.
- [ ] Rezerwacja ręczna pozwala wybrać istniejącego gościa.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M7) |
| UI | Gotowe (M11) |

Zdecydowane: [Q-03](../open-questions.md#q-03), [Q-04](../open-questions.md#q-04). Otwarte: [Q-18](../open-questions.md#q-18).
