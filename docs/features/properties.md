# Funkcjonalność: Obiekty

> Zarządzanie obiektem noclegowym (dane, zasady pobytu, ustawienia rezerwacji) i pulpit właściciela.
> Etapy: M5 (API), M11 (UI). Izolacja danych: [ADR 0008](../decisions/0008-multi-tenancy-ownership.md).

## 1. Cel i wartość dla użytkownika

Obiekt to „tenant” właściciela i źródło publicznej strony `/o/:slug`. Właściciel ustawia dane kontaktowe, godziny zameldowania, politykę anulowania i czas na potwierdzenie rezerwacji. Pulpit pokazuje, co wymaga jego uwagi dziś.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę edytować dane obiektu i adres strony, aby goście znaleźli aktualne informacje.
- Jako **właściciel** chcę ustawić, do ilu dni przed przyjazdem gość może bezpłatnie anulować, aby chronić się przed późnymi rezygnacjami.
- Jako **właściciel** chcę ustawić, po ilu godzinach niepotwierdzona rezerwacja wygasa, aby termin nie był blokowany w nieskończoność.
- Jako **właściciel** chcę widzieć na pulpicie dzisiejsze przyjazdy i wyjazdy oraz rezerwacje do decyzji.
- Jako **właściciel kilku obiektów** chcę przełączać się między nimi.

## 3. Reguły biznesowe

- [BR-10](../architecture/business-rules.md#br-10): brak usunięcia lub dezaktywacji z przyszłymi rezerwacjami; soft delete.
- [BR-12](../architecture/business-rules.md#br-12): tylko własne obiekty.
- [BR-13](../architecture/business-rules.md#br-13): nieaktywny obiekt nie przyjmuje rezerwacji.
- Ustawienia wpływają na [BR-07](../architecture/business-rules.md#br-07) (`pendingExpiryHours`) i [BR-08](../architecture/business-rules.md#br-08) (`cancellationDeadlineDays`).

## 4. Model danych

[Property](../architecture/data-model.md#property-obiekt); pulpit czyta też [Room](../architecture/data-model.md#room-pokój--domek) i [Reservation](../architecture/data-model.md#reservation-rezerwacja).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/properties` | `OWNER` (własne), `ADMIN` (wszystkie, opcjonalnie `?ownerId=`) | – | `200` `{ data: PropertyListItemDto[] }` | – |
| `POST` | `/properties` | `OWNER`, `ADMIN` | `CreatePropertyDto` | `201` `PropertyDto` + `Location` | `409 SLUG_TAKEN` |
| `GET` | `/properties/:id` | `OWNER`, `ADMIN` | – | `200` `PropertyDto` | `404` |
| `PATCH` | `/properties/:id` | `OWNER`, `ADMIN` | `UpdatePropertyDto` | `200` `PropertyDto` | `409 SLUG_TAKEN`, `409 HAS_FUTURE_RESERVATIONS` (przy `isActive: false`) |
| `DELETE` | `/properties/:id` | `OWNER`, `ADMIN` | – | `204` | `409 HAS_FUTURE_RESERVATIONS` |
| `GET` | `/properties/:id/dashboard` | `OWNER`, `ADMIN` | – | `200` `DashboardDto` | `404` ([Q-08](../open-questions.md#q-08)) |

**`CreatePropertyDto` / `UpdatePropertyDto`** (w `Update` wszystkie pola opcjonalne):

| Pole | Walidacja | Domyślnie |
|-|-|-|
| `name` | 1–120 znaków | – (wymagane) |
| `slug` | `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–60 | generowany z `name` (transliteracja polskich znaków, sufiks `-2`, `-3` przy kolizji) |
| `description` | ≤ 5000 | `null` |
| `street`, `postalCode` (`NN-NNN`), `city` | wymagane przy tworzeniu | – |
| `phone` | ≤ 30 | `null` |
| `contactEmail` | e-mail | `null` |
| `checkInTime`, `checkOutTime` | `HH:mm` | `15:00`, `11:00` |
| `cancellationDeadlineDays` | 0–60 | 7 |
| `pendingExpiryHours` | 1–168 | 48 |
| `isActive` | bool | `true` |
| `ownerId` | UUID, **tylko `ADMIN`**, wymagane dla `ADMIN` | właściciel = bieżący użytkownik |

Przy tworzeniu przez admina z `POST /admin/owners` adres może być pusty ([Q-13](../open-questions.md#q-13)), a właściciel uzupełnia go w ustawieniach.

**`PropertyDto`**: wszystkie pola powyżej + `id`, `currency`, `ownerId`, `coverPhoto: PhotoDto | null`, `photos: PhotoDto[]` (zdjęcia obiektu), `publicUrl` (`${APP_PUBLIC_URL}/o/<slug>`), `createdAt`, `updatedAt`.
**`PropertyListItemDto`**: `id`, `name`, `slug`, `city`, `isActive`, `roomsCount`.

**`DashboardDto`** („dziś” z `Clock`):

| Pole | Opis |
|-|-|
| `arrivalsToday`, `departuresToday` | liczba `CONFIRMED` z `checkIn = today` / `checkOut = today` |
| `pendingCount` | liczba `PENDING` |
| `occupancyThisMonth` | % zajętych nocy pokoi aktywnych (rezerwacje `CONFIRMED`, `COMPLETED`) w bieżącym miesiącu, liczba całkowita 0–100 |
| `pendingReservations` | do 10 najstarszych `PENDING`: `ReservationListItemDto` (z `expiresAt`) |
| `upcomingArrivals` | `CONFIRMED` z `checkIn` w `[today, today+7)` |
| `occupancyNext30Days` | `[{ date, occupiedRooms, totalRooms }]` |

## 6. Backend: zadania

- [x] Moduł `properties`: kontroler, `PropertiesService`, `PropertiesRepository`; dostęp przez `OWNERSHIP_POLICY` i filtr `ownerId` w zapytaniu. `ADMIN` bez `ownerId` w `POST` → 400, `OWNER` z cudzym `ownerId` → 403, nieznany właściciel → 404.
- [x] `SlugGenerator` (domena: transliteracja `ą→a, ł→l, …`, kebab-case) + obsługa kolizji: `modules/properties/domain/slug.ts` (M4).
- [x] `OwnershipPolicy` jako współdzielony serwis używany przez wszystkie moduły panelu ([application-layer.md](../../apps/api/docs/application-layer.md#polityki-dostępu)).
- [x] BR-10 przy `DELETE` i `PATCH isActive=false` (`ReservationsQueryService.countFutureActive`, w transakcji z `SELECT … FOR UPDATE` na obiekcie).
- [x] Soft delete: `deletedAt`, wykluczenie z list, szczegółów i pokoi obiektu (M5). Wykluczenie z `/public/**`: M8.
- [x] Pulpit: `ReservationsQueryService.dashboard` (agregaty SQL: `COUNT … FILTER`, `daterange`, `generate_series`; bez N+1). Obłożenie liczy rezerwacje `CONFIRMED`/`COMPLETED` aktywnych pokoi.

## 7. Frontend: ekrany i zadania

Ekrany: O2 (pulpit), O8 (ustawienia obiektu): [screens.md](../../apps/web/docs/screens.md).

- [ ] Przełącznik obiektu w sidebarze (`GET /properties`), wybór zapamiętany w `localStorage`. Gdy obiekt jest jeden, przełącznik jest tylko etykietą.
- [ ] `/panel`: pulpit z KPI, kartą „Wymagają Twojej decyzji” (przyciski „Potwierdź” i „Odrzuć”, czas do wygaśnięcia), „Najbliższe przyjazdy” i wykresem obłożenia.
- [ ] `/panel/ustawienia`: karty „Dane obiektu” (z kopiowaniem adresu strony), „Zasady pobytu”, „Rezerwacje”, „Zdjęcia obiektu”; link „Podgląd strony obiektu”.
- [ ] Błędy: `SLUG_TAKEN` przy polu adresu, `HAS_FUTURE_RESERVATIONS` jako alert z liczbą rezerwacji.
- [ ] Stan pusty: właściciel bez obiektu widzi komunikat „Skontaktuj się z administratorem” (obiekty zakłada admin).

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| `SlugGenerator`: polskie znaki, spacje, kolizje | unit | – |
| Owner B → `GET/PATCH/DELETE /properties/:idA` → 404 | int | BR-12 |
| `GET /properties` zwraca tylko własne obiekty | int | BR-12 |
| `DELETE` z przyszłą rezerwacją → 409; bez → 204, obiekt znika z list i `/public` | int | BR-10 |
| Dashboard: liczniki dla ustalonego „dziś” | int | – |
| Formularz ustawień: walidacja, błąd `SLUG_TAKEN` | ui | – |

## 9. Kryteria akceptacji

- [ ] Zmiana `cancellationDeadlineDays` wpływa na termin anulowania widoczny dla gościa.
- [ ] Dezaktywowany obiekt zwraca 404 na stronie publicznej.
- [ ] Pulpit pokazuje poprawne liczby dla danych z seeda.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M5); wykluczenie usuniętych z `/public/**` w M8 |
| UI | Nie rozpoczęto |

Otwarte: [Q-08](../open-questions.md#q-08) (dashboard), [Q-13](../open-questions.md#q-13) (adres).
