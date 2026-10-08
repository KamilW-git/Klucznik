# Funkcjonalność: Pokoje

> Zarządzanie pokojami i domkami obiektu: dane, pojemność, cena bazowa, minimalny pobyt, widoczność.
> Etapy: M5 (API), M11 (UI). Cennik sezonowy: [pricing.md](pricing.md); zdjęcia: [photos.md](photos.md); blokady: [availability.md](availability.md).

## 1. Cel i wartość dla użytkownika

Pokój (lub domek) to jednostka rezerwacji. Właściciel opisuje go, ustala pojemność i cenę bazową oraz decyduje, czy jest widoczny na stronie.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę dodać pokój z opisem, pojemnością i ceną, aby goście mogli go rezerwować.
- Jako **właściciel** chcę ukryć pokój (np. w remoncie), aby nie pojawiał się na stronie.
- Jako **właściciel** chcę usunąć pokój, którego już nie wynajmuję, bez utraty historii rezerwacji.

## 3. Reguły biznesowe

- [BR-02](../architecture/business-rules.md#br-02) (`capacity`), [BR-03](../architecture/business-rules.md#br-03) (`minNights`), [BR-05](../architecture/business-rules.md#br-05) (`basePricePerNight`).
- [BR-10](../architecture/business-rules.md#br-10): usunięcie lub dezaktywacja tylko bez przyszłych aktywnych rezerwacji; soft delete.
- [BR-12](../architecture/business-rules.md#br-12), [BR-13](../architecture/business-rules.md#br-13).

## 4. Model danych

[Room](../architecture/data-model.md#room-pokój--domek).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/properties/:propertyId/rooms` | `OWNER`, `ADMIN` | query: `includeInactive` (domyślnie `true`) | `200` `{ data: RoomDto[] }` (sort `name:asc`) | `404` |
| `POST` | `/properties/:propertyId/rooms` | `OWNER`, `ADMIN` | `CreateRoomDto` | `201` `RoomDto` + `Location: /api/v1/rooms/:id` | `404` |
| `GET` | `/rooms/:id` | `OWNER`, `ADMIN` | – | `200` `RoomDto` | `404` |
| `PATCH` | `/rooms/:id` | `OWNER`, `ADMIN` | `UpdateRoomDto` | `200` `RoomDto` | `409 HAS_FUTURE_RESERVATIONS` (przy `isActive: false`) |
| `DELETE` | `/rooms/:id` | `OWNER`, `ADMIN` | – | `204` | `409 HAS_FUTURE_RESERVATIONS` |

| Pole (`Create`/`Update`) | Walidacja | Domyślnie |
|-|-|-|
| `name` | 1–120 | wymagane |
| `description` | ≤ 5000 | `null` |
| `capacity` | int 1–30 | wymagane |
| `basePricePerNight` | int ≥ 0 (grosze), ≤ 10 000 000 | wymagane |
| `minNights` | int 1–30 | 1 |
| `isActive` | bool | `true` |

**`RoomDto`**: pola powyżej + `id`, `propertyId`, `currency`, `coverPhoto: PhotoDto | null`, `photos: PhotoDto[]`, `upcomingReservationsCount` (`PENDING`/`CONFIRMED`, `checkOut > today`), `createdAt`, `updatedAt`.

Zmiana `basePricePerNight` nie zmienia cen istniejących rezerwacji (BR-05).

## 6. Backend: zadania

- [x] Moduł `rooms`: kontroler(y) dla ścieżek zagnieżdżonych i płaskich, `RoomsService`, `RoomsRepository`.
- [x] Polityka własności: pokój → `property.ownerId` (`OwnershipPolicy`).
- [x] BR-10: `countFutureActive(roomId)` przed `DELETE` i dezaktywacją, w transakcji z `SELECT … FOR UPDATE` na pokoju (ten sam zamek co tworzenie rezerwacji w M7).
- [x] Soft delete + wykluczenie usuniętych z list (M5); z dostępności i kalendarza: M6 (historia rezerwacji pozostaje).
- [x] `upcomingReservationsCount` jednym zapytaniem grupującym.

## 7. Frontend: ekrany i zadania

Ekrany: O6 (lista pokoi), O7 zakładka „Informacje”: [screens.md](../../apps/web/docs/screens.md).

- [ ] `/panel/pokoje`: siatka kart (zdjęcie, nazwa, „do N osób”, „od X zł / noc”, min. noce, przełącznik „Widoczny na stronie”, liczba nadchodzących rezerwacji). Nieaktywne karty przygaszone.
- [ ] Stan pusty: „Nie masz jeszcze żadnych pokoi – dodaj pierwszy, aby goście mogli rezerwować”.
- [ ] „+ Dodaj pokój” → `/panel/pokoje/nowy` (formularz zakładki „Informacje”).
- [ ] `/panel/pokoje/:roomId`: zakładki „Informacje”, „Zdjęcia”, „Cennik”, „Blokady terminów”; sticky „Zapisz zmiany”.
- [ ] Pole ceny w złotych z konwersją do groszy (`shared/lib/money.ts`).
- [ ] Usuwanie z dialogiem potwierdzenia; `HAS_FUTURE_RESERVATIONS` → komunikat z liczbą rezerwacji i linkiem do listy.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| CRUD pokoju (201 + `Location`, 200, 204) | int | – |
| Owner B → `/rooms/:idA` → 404 | int | BR-12 |
| `DELETE` z przyszłą rezerwacją → 409 `HAS_FUTURE_RESERVATIONS` | int | BR-10 |
| `PATCH isActive=false` z przyszłą rezerwacją → 409 | int | BR-10 |
| Usunięty pokój znika z dostępności publicznej | int | BR-13 |
| Formularz: konwersja zł → grosze, walidacja | ui | – |

## 9. Kryteria akceptacji

- [ ] Nowy aktywny pokój pojawia się na stronie publicznej obiektu.
- [ ] Przełączenie „Widoczny na stronie” ukrywa pokój (o ile nie ma przyszłych rezerwacji).
- [ ] Usunięty pokój nadal jest widoczny w historii dawnych rezerwacji.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M5) |
| UI | Nie rozpoczęto |

Otwarte: [Q-20](../open-questions.md#q-20) (udogodnienia pokoi; w MVP tylko w opisie).
