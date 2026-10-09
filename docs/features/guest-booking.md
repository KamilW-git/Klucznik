# Funkcjonalność: Publiczny proces rezerwacji i zarządzanie przez token

> Strona obiektu (white-label), wyszukiwanie dostępności, wysłanie prośby o rezerwację oraz podgląd i anulowanie rezerwacji przez gościa z linku w e-mailu.
> Etapy: M8 (API), M12 (UI). Token gościa: [security.md](../architecture/security.md#token-gościa).

## 1. Cel i wartość dla użytkownika

Gość rezerwuje bezpośrednio u gospodarza, bez konta i bez prowizji pośrednika. Widzi jasną cenę i politykę anulowania, a rezerwacją zarządza z linku w e-mailu. Właściciel dostaje prośbę do potwierdzenia.

## 2. Historyjki użytkownika

- Jako **gość** chcę zobaczyć stronę obiektu z pokojami, zdjęciami, cenami „od” i kontaktem.
- Jako **gość** chcę podać daty i liczbę osób i zobaczyć dostępne pokoje z ceną za cały pobyt.
- Jako **gość** chcę wysłać prośbę o rezerwację, podając swoje dane, i dostać potwierdzenie e-mailem.
- Jako **gość** chcę z linku w e-mailu sprawdzić status rezerwacji i ją anulować, jeśli jeszcze mogę.

## 3. Reguły biznesowe

[BR-01](../architecture/business-rules.md#br-01), [BR-02](../architecture/business-rules.md#br-02), [BR-03](../architecture/business-rules.md#br-03), [BR-04](../architecture/business-rules.md#br-04), [BR-05](../architecture/business-rules.md#br-05), [BR-06](../architecture/business-rules.md#br-06), [BR-07](../architecture/business-rules.md#br-07), [BR-08](../architecture/business-rules.md#br-08), [BR-13](../architecture/business-rules.md#br-13). Algorytm dostępności: [availability.md](availability.md#algorytm-dostępności-application--domain).

## 4. Model danych

[Property](../architecture/data-model.md#property-obiekt), [Room](../architecture/data-model.md#room-pokój--domek), [Photo](../architecture/data-model.md#photo), [Guest](../architecture/data-model.md#guest-gość), [Reservation](../architecture/data-model.md#reservation-rezerwacja).

## 5. Kontrakt API

Wszystkie endpointy są publiczne (`@Public()`), z limitami z [security.md](../architecture/security.md#rate-limiting) (`GET` 60/min, `POST` 5/min na IP → 429 `RATE_LIMITED`). Nieaktywny lub usunięty obiekt → 404.

| Metoda | Ścieżka | Request | Response | Błędy |
|-|-|-|-|-|
| `GET` | `/public/properties/:slug` | – | `200` `PublicPropertyDto` | `404` |
| `GET` | `/public/properties/:slug/availability` | query: `checkIn`, `checkOut`, `guests` (1–99) | `200` `AvailabilityResultDto` | `400`, `404`, `422 INVALID_STAY_DATES` |
| `GET` | `/public/properties/:slug/occupancy` | query: `from`, `to` (maks. 93 dni) | `200` `PublicOccupancyDto` | `400` ([Q-17](../open-questions.md#q-17)) |
| `POST` | `/public/properties/:slug/reservations` | `CreatePublicReservationDto` | `201` `PublicReservationCreatedDto` (**bez** `Location`) | `404` (pokój innego obiektu), `409 RESERVATION_OVERLAP`, `422 CAPACITY_EXCEEDED`/`MIN_NIGHTS_NOT_MET`/`INVALID_STAY_DATES`/`ROOM_NOT_BOOKABLE` |
| `GET` | `/public/reservations/:token` | – | `200` `PublicReservationDto` | `404` |
| `POST` | `/public/reservations/:token/cancel` | `{ reason? }` (≤ 500) | `200` `PublicReservationDto` | `404`, `422 CANCELLATION_DEADLINE_PASSED` (`details.cancellableUntil`), `409 INVALID_STATUS_TRANSITION` |

**DTO**

- `PublicPropertyDto`: `name`, `slug`, `description`, `street`, `postalCode`, `city`, `phone`, `contactEmail`, `checkInTime`, `checkOutTime`, `cancellationDeadlineDays`, `pendingExpiryHours`, `currency`, `photos: PhotoDto[]`, `rooms: PublicRoomDto[]`. Bez `ownerId` i bez danych wewnętrznych.
- `PublicRoomDto`: `id`, `name`, `description`, `capacity`, `minNights`, `priceFrom` (min. z ceny bazowej i stawek z `dateTo ≥ today`), `photos`. Tylko pokoje aktywne.
- `AvailabilityResultDto`: `{ checkIn, checkOut, nights, guests, currency, rooms: [{ room: PublicRoomDto, available, unavailableReason: 'OCCUPIED' | 'CAPACITY_EXCEEDED' | 'MIN_NIGHTS_NOT_MET' | null, minNights, totalPrice, averagePricePerNight, breakdown: [{ date, price }] }] }`. Zwraca wszystkie aktywne pokoje z powodem niedostępności, bo ekran P2 pokazuje pokoje niedostępne i informację o minimalnym pobycie. Cena, średnia (zaokrąglona do grosza) i rozbicie tylko dla dostępnych, dla pozostałych `null`. Kolizje (numery i daty innych rezerwacji) nie są ujawniane. BR-04 bez wyjątku Q-01: przyjazd w przeszłości → 422.
- `PublicOccupancyDto`: `{ from, to, rooms: [{ roomId, occupiedNights: string[] }] }`, bez danych gości. Zajęte noce to noce aktywnych rezerwacji (`PENDING`, `CONFIRMED`) i blokad (BR-01), przycięte do `[from, to]`; pokoje aktywne, sort po nazwie.
- `CreatePublicReservationDto`: `roomId`, `checkIn`, `checkOut`, `guestsCount`, `guest: { firstName (1–100), lastName (1–100), email (wymagany), phone (wymagany, ≤ 30) }`, `guestNotes?` (≤ 2000). Brak pola ceny (BR-05). Akceptacja regulaminu jest tylko po stronie UI.
- `PublicReservationCreatedDto`: `number`, `status` (`PENDING`), `room: { name }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `expiresAt`, `guestEmail`. **Bez tokenu:** link trafia wyłącznie do e-maila.
- `PublicReservationDto`: `number`, `status`, `property: { name, slug, phone, contactEmail, street, postalCode, city, checkInTime, checkOutTime }`, `room: { name, coverPhoto }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `guestNotes`, `canCancel`, `cancellableUntil` (data lub `null`), `cancelledAt`. Bez `internalNotes`.

Wyjątek od konwencji `Location`: `POST /public/properties/:slug/reservations` nie zwraca `Location`, bo adres zasobu zawiera sekretny token.

Token: `randomBytes(32)` w base64url, w bazie tylko SHA-256 (`guestAccessTokenHash`). Nieznany token i link po `checkOut + 30 dni` dają ten sam 404 ([Q-11](../open-questions.md#q-11)). `cancellableUntil` to ostatni dzień bezpłatnego anulowania dla `PENDING` i `CONFIRMED` (gość anuluje `PENDING` zawsze), dla pozostałych statusów `null`. W logach błędów z URL zostaje tylko 6 pierwszych znaków tokenu (`common/http/mask-url.ts`).

## 6. Backend: zadania

- [x] Moduł `public`: `PublicController`, `PublicBookingService`, `PublicPropertiesRepository` (odczyt strony obiektu). Przypadki użycia rezerwacji gościa w `reservations/application/guest-booking.service.ts` (eksport `GuestBookingService`).
- [x] `PublicPropertyQuery`: obiekt po `slug` (aktywny, nieusunięty) z pokojami, zdjęciami i `priceFrom`.
- [x] Dostępność: `AvailabilityService.checkRooms` w trybie raportu dla wszystkich pokoi (stawki, rezerwacje i blokady po jednym zapytaniu dla całego obiektu); zajętość: `AvailabilityService.occupiedNights`.
- [x] `GuestBookingService.createOnline`: transakcja → `FOR UPDATE` pokoju → `AvailabilityService` (assert) → upsert gościa po `(propertyId, email)` ([Q-04](../open-questions.md#q-04)) → numer → insert `PENDING` z `expiresAt = now + pendingExpiryHours` → `ReservationEvent(CREATED, GUEST)` → po commicie `ReservationCreated`. Token (32 B) i jego hash powstają przy wysyłce `reservation-received` ([Q-16](../open-questions.md#q-16)), więc surowy token jest tylko w linku w e-mailu.
- [x] `GuestBookingService.getByToken` i `cancelByToken`: hash tokenu → rezerwacja; ważność ([Q-11](../open-questions.md#q-11), `guest-access-token.ts`); BR-08 przez `cancellation-policy.ts`; `cancelledBy = GUEST`, wpis historii z aktorem `GUEST`.
- [x] Throttling per endpoint, a w logach maskowanie tokenu (pokazujemy tylko pierwsze 6 znaków).

## 7. Frontend: ekrany i zadania

Ekrany: P1–P5: [screens.md](../../apps/web/docs/screens.md). `PublicLayout`: marka obiektu, a w stopce „Rezerwacje obsługuje Klucznik”. Projekt mobile-first.

- [x] `/o/:slug` (P1): hero z wyszukiwarką (zakres dat bez przeszłości, goście do największej pojemności pokoju), „O nas”, karty pokoi („do N osób”, „min. N nocy”, „od X zł / noc”, „Zobacz terminy” – dialog z kalendarzem zajętości pokoju z `/occupancy`, potem P2), galeria z podglądem, lokalizacja z godzinami i zasadami (BR-07, BR-08) oraz linkiem „Pokaż na mapie”, kontakt. Na mobile sticky przycisk „Sprawdź dostępność”. Obiekt pobiera raz `PublicPropertyLayout` dla wszystkich stron `/o/:slug/*`; nieaktywny lub nieznany → „Nie znaleziono obiektu”.
- [x] `/o/:slug/dostepnosc?checkIn&checkOut&guests` (P2): pasek podsumowania z „Zmień”, karty pokoi z ceną „1 640 zł za 4 noce (średnio 410 zł / noc)” (dostępne najpierw), pokoje niedostępne przygaszone z powodem (zajęty, za mało miejsc), komunikat o minimalnym pobycie z „Wydłuż pobyt do N nocy”, stan pusty „Brak wolnych pokoi w wybranym terminie – spróbuj innych dat”. Na desktopie mini-kalendarz zajętości (`/occupancy`) z wyborem pokoju. Błędne parametry w URL → wyszukiwarka; `422` → komunikat i „Zmień termin”.
- [x] `/o/:slug/rezerwacja?roomId&checkIn&checkOut&guests` (P3): kroki „Termin → Dane → Potwierdzenie”, formularz (zod, `VALIDATION_ERROR` na pola), checkbox „Akceptuję warunki rezerwacji” z dialogiem zasad obiektu ([Q-19](../open-questions.md#q-19): bez atrapy regulaminu, tylko UI), sticky podsumowanie z rozbiciem ceny z API i polityką anulowania (na telefonie nad formularzem). Obsługa 409 (termin właśnie zajęty → komunikat, odświeżenie dostępności, powrót do wyników), 422 i 429. Pokój niedostępny w chwili wejścia → powód zamiast formularza.
- [x] `/o/:slug/rezerwacja/wyslana` (P4): numer z kopiowaniem, status „Oczekuje na potwierdzenie”, podsumowanie, informacja o czasie potwierdzenia (`pendingExpiryHours`, `expiresAt`) i e-mailu, „Co dzieje się dalej?”. Dane pochodzą z odpowiedzi mutacji (state routera, przejście z `replace`), a odświeżenie strony przekierowuje na stronę obiektu.
- [x] `/r/:token` (P5): nagłówek z marką obiektu, karta rezerwacji (status, termin, goście, godziny, cena, uwagi), kontakt („Zadzwoń”, „Napisz”, adres z mapą), sekcja anulowania („Możesz bezpłatnie anulować rezerwację do {cancellableUntil}”; dla `PENDING` „Możesz anulować prośbę, dopóki gospodarz jej nie potwierdzi”), modal potwierdzenia z powodem; po terminie tekst „Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem”; 404 → „Link jest nieaktualny…”. Token nie trafia do tytułu ani nagłówka `Referer` (meta `no-referrer`), strona ma `noindex`.
- [x] Ustaw `document.title` na nazwę obiektu i dodaj meta `description` (podstawowe SEO w SPA): `useDocumentMeta`.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| `GET /public/properties/:slug` nieaktywnego obiektu → 404 | int | BR-13 |
| Dostępność: pokój zajęty → `available: false, OCCUPIED`; za mało nocy → `MIN_NIGHTS_NOT_MET` | int | BR-01, BR-03 |
| Dostępność z `checkIn` w przeszłości → 422 | int | BR-04 |
| Utworzenie → 201 `PENDING`, `expiresAt`, hash tokenu w bazie, brak tokenu i `Location` w odpowiedzi, e-mail z działającym linkiem | int | BR-07 |
| Link po `checkOut + 30 dni` i nieznany token → 404 | int, unit | Q-11 |
| Szósty `POST /public/**` z jednego IP w minucie → 429 | int | – |
| Zajętość: rezerwacje i blokady przycięte do zakresu, bez anulowanych | int | BR-01 |
| Body z `totalPrice` → 400 | int | BR-05 |
| Gość anuluje `CONFIRMED` po terminie → 422; przed terminem → 200 | int | BR-08 |
| Ponowne anulowanie → 409 | int | BR-06 |
| `cancellation-policy`: dzień terminu, dzień po, `PENDING` | unit | BR-08 |
| Formularz P3: walidacja, obsługa 409 | ui | BR-01 |
| P5: wariant przed i po terminie anulowania | ui | BR-08 |

## 9. Kryteria akceptacji

- [x] Gość przechodzi P1 → P2 → P3 → P4 na telefonie (375 px) bez przewijania w poziomie (M12: test na żywo z API i seedem).
- [x] Po wysłaniu prośby właściciel widzi rezerwację `PENDING` w panelu, a gość dostaje e-mail z linkiem `/r/:token` (Mailpit). M12 na żywo: e-mail „Nowa rezerwacja do potwierdzenia” do gospodarza i link gościa w Mailpit; lista `PENDING` w panelu działa od M11.
- [x] Link z e-maila pozwala anulować rezerwację tylko zgodnie z BR-08.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M8, e-maile z linkiem: M9) |
| UI | Gotowe (M12) |

Zdecydowane: [Q-04](../open-questions.md#q-04), [Q-11](../open-questions.md#q-11), [Q-17](../open-questions.md#q-17). Zdecydowane też: [Q-16](../open-questions.md#q-16). Otwarte: [Q-19](../open-questions.md#q-19) (regulamin), [Q-20](../open-questions.md#q-20) (udogodnienia); UI realizuje rekomendacje. Kontrakt: pole `room` w `PublicReservationCreatedDto` bez schematu w `openapi.json` ([H-016](../handoff.md#zgłoszenia)).
