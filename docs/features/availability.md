# Funkcjonalność: Dostępność, blokady terminów i kalendarz

> Blokady terminów, algorytm sprawdzania dostępności (wspólny dla panelu i strony publicznej), wycena pokoju dla panelu i kalendarz obłożenia.
> Etapy: M6 (API), M11 (UI). Publiczne wyszukiwanie dostępności: [guest-booking.md](guest-booking.md).

## 1. Cel i wartość dla użytkownika

Właściciel blokuje terminy (remont, użytek własny), a system nigdy nie pozwoli na podwójną rezerwację. Kalendarz obłożenia to najważniejszy ekran właściciela: jeden rzut oka pokazuje wszystkie pokoje, rezerwacje i blokady.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę zablokować domek na czas remontu, aby nikt go wtedy nie zarezerwował.
- Jako **właściciel** chcę widzieć kalendarz wszystkich pokoi na 2 tygodnie lub miesiąc, z rezerwacjami w kolorach statusów.
- Jako **właściciel** przyjmujący rezerwację telefoniczną chcę od razu zobaczyć, czy pokój jest wolny i ile kosztuje pobyt.

## 3. Reguły biznesowe

- [BR-01](../architecture/business-rules.md#br-01): kolizje rezerwacji i blokad; blokada na zajęty termin → 409 `BLOCK_OVERLAPS_RESERVATION` ([Q-15](../open-questions.md#q-15)).
- [BR-02](../architecture/business-rules.md#br-02), [BR-03](../architecture/business-rules.md#br-03), [BR-04](../architecture/business-rules.md#br-04), [BR-05](../architecture/business-rules.md#br-05), [BR-13](../architecture/business-rules.md#br-13): składowe algorytmu dostępności.
- [BR-12](../architecture/business-rules.md#br-12).

## 4. Model danych

[AvailabilityBlock](../architecture/data-model.md#availabilityblock-blokada-terminu), [Reservation](../architecture/data-model.md#reservation-rezerwacja), [Room](../architecture/data-model.md#room-pokój--domek), [SeasonalRate](../architecture/data-model.md#seasonalrate-stawka-sezonowa).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/rooms/:id/blocks` | `OWNER`, `ADMIN` | query: `from?`, `to?` | `200` `{ data: AvailabilityBlockDto[] }` | `404` |
| `POST` | `/rooms/:id/blocks` | `OWNER`, `ADMIN` | `{ dateFrom, dateTo, reason? }` | `201` `AvailabilityBlockDto` + `Location` | `409 BLOCK_OVERLAPS_RESERVATION` |
| `DELETE` | `/blocks/:id` | `OWNER`, `ADMIN` | – | `204` | – |
| `GET` | `/rooms/:id/quote` | `OWNER`, `ADMIN` | query: `checkIn`, `checkOut`, `guests`, `excludeReservationId?` | `200` `RoomQuoteDto` | `422 INVALID_STAY_DATES` ([Q-17](../open-questions.md#q-17)) |
| `GET` | `/properties/:id/calendar` | `OWNER`, `ADMIN` | query: `from`, `to` (daty dni widoku, włącznie; maks. 93 dni) | `200` `CalendarDto` | `400` (zakres) |

- **`AvailabilityBlockDto`**: `id`, `roomId`, `dateFrom`, `dateTo` (noce włącznie), `reason`, `createdAt`. `reason` ≤ 200 znaków. `dateTo ≥ dateFrom`, maks. 366 nocy.
- **`RoomQuoteDto`**: `{ roomId, checkIn, checkOut, nights, available, unavailableReason?, conflicts: [{ type: 'RESERVATION' | 'BLOCK', id, number?, dateFrom, dateTo }], minNights, totalPrice, currency, breakdown }`. Służy do „Cena wyliczona” i komunikatu kolizji w O5. Nie rzuca 409, tylko raportuje.
- **`CalendarDto`**:

```json
{
  "from": "2026-08-01", "to": "2026-08-31",
  "rooms": [{ "id": "…", "name": "Domek Sosna", "isActive": true }],
  "reservations": [{ "id": "…", "roomId": "…", "number": "KL-2026-000123", "checkIn": "2026-08-14",
                     "checkOut": "2026-08-18", "status": "CONFIRMED", "source": "ONLINE",
                     "guestName": "Anna Kowalska", "guestsCount": 3, "totalPrice": 164000 }],
  "blocks": [{ "id": "…", "roomId": "…", "dateFrom": "2026-08-20", "dateTo": "2026-08-22", "reason": "Remont" }]
}
```

Kalendarz zwraca rezerwacje `PENDING`, `CONFIRMED` i `COMPLETED`, których pobyt przecina zakres, oraz blokady przecinające zakres. Pomija pokoje usunięte.

## Algorytm dostępności (application + domain)

Wspólny serwis `AvailabilityService.check(room, property, stay, guests, options)` używany przez `quote`, dostępność publiczną i tworzenie rezerwacji:

1. BR-13: pokój i obiekt aktywne → inaczej `ROOM_NOT_BOOKABLE`,
2. BR-04: daty pobytu względem `Clock.today()` (opcje dla rezerwacji ręcznej: [Q-01](../open-questions.md#q-01)),
3. BR-02: `guests ≤ capacity` → `CAPACITY_EXCEEDED`,
4. BR-03: `nights ≥ resolveMinNights(...)` → `MIN_NIGHTS_NOT_MET`,
5. BR-01: kolizje z rezerwacjami `PENDING`/`CONFIRMED` (bez `excludeReservationId`) i blokadami → `OCCUPIED`,
6. BR-05: `calculatePrice(...)`.

Kroki 1–4 to czyste funkcje domeny. Krok 5 to zapytanie repozytorium, które przy tworzeniu rezerwacji działa w transakcji z `FOR UPDATE` ([business-rules.md](../architecture/business-rules.md#br-01)). Wynik `check` jest obiektem (dostępny lub powód), a tryb „assert” rzuca błąd domenowy.

## 6. Backend: zadania

- [ ] Moduł `availability`: `BlocksController`, `BlocksService` (kolizja z rezerwacjami w transakcji z blokadą pokoju), `BlocksRepository`.
- [ ] `AvailabilityService` (algorytm wyżej) + `CollisionsRepository.findCollisions(roomId, stay, excludeReservationId?)`.
- [ ] `GET /rooms/:id/quote`.
- [ ] `CalendarController` + zapytanie kalendarza (2 zapytania: rezerwacje z gośćmi, blokady; bez N+1).
- [ ] Walidacja zakresu kalendarza (`from ≤ to`, ≤ 93 dni) → 400.

## 7. Frontend: ekrany i zadania

Ekrany: O3 (kalendarz), O7 zakładka „Blokady terminów”, O5 (dostępność i cena): [screens.md](../../apps/web/docs/screens.md).

- [ ] `/panel/kalendarz`: siatka pokoje × dni (Pn–Nd, weekendy cieniowane, dziś wyróżnione), nawigacja miesiąca, „Dziś”, przełącznik „2 tygodnie / Miesiąc”.
- [ ] Paski rezerwacji od `checkIn` do `checkOut` (połowa dnia na styku), kolory statusów, `PENDING` paskowane; blokady szare kreskowane z etykietą.
- [ ] Tooltip (gość, daty, cena, status); kliknięcie otwiera szczegóły rezerwacji (drawer z O4).
- [ ] Przyciski „+ Dodaj rezerwację” (O5) i „+ Zablokuj termin” (dialog blokady).
- [ ] Mobile: uproszczona lista per pokój.
- [ ] Zakładka „Blokady terminów” pokoju: lista, dodawanie (dialog z zakresem dat), usuwanie; błąd `BLOCK_OVERLAPS_RESERVATION` z numerem rezerwacji.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| `overlapsBlock`: blokada 10–12 vs pobyty `[12,14)` (kolizja) i `[13,15)` (brak) | unit | BR-01 |
| `AvailabilityService`: każdy powód niedostępności | unit (fake repo) | BR-01..04, 13 |
| Blokada na termin z rezerwacją `CONFIRMED` → 409 | int | BR-01 |
| Rezerwacja na termin z blokadą → 409 | int | BR-01 |
| Kalendarz: zwraca tylko przecinające się elementy, bez anulowanych | int | – |
| Owner B → kalendarz obiektu A → 404 | int | BR-12 |
| Kalendarz UI: pozycjonowanie pasków, styk dni | ui | – |

## 9. Kryteria akceptacji

- [ ] Zablokowany termin nie pojawia się jako dostępny na stronie publicznej.
- [ ] Kalendarz pokazuje rezerwacje i blokady wszystkich pokoi dla wybranego miesiąca jednym żądaniem.
- [ ] W O5 cena i kolizja aktualizują się po zmianie dat lub pokoju.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | Nie rozpoczęto |

Otwarte: [Q-15](../open-questions.md#q-15) (blokada vs rezerwacja), [Q-17](../open-questions.md#q-17) (`quote`, zajętość publiczna).
