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

Wszystkie endpointy są publiczne (`@Public()`), z limitami z [security.md](../architecture/security.md#rate-limiting). Nieaktywny lub usunięty obiekt → 404.

| Metoda | Ścieżka | Request | Response | Błędy |
|-|-|-|-|-|
| `GET` | `/public/properties/:slug` | – | `200` `PublicPropertyDto` | `404` |
| `GET` | `/public/properties/:slug/availability` | query: `checkIn`, `checkOut`, `guests` | `200` `AvailabilityResultDto` | `422 INVALID_STAY_DATES` |
| `GET` | `/public/properties/:slug/occupancy` | query: `from`, `to` (maks. 93 dni) | `200` `PublicOccupancyDto` | `400` ([Q-17](../open-questions.md#q-17)) |
| `POST` | `/public/properties/:slug/reservations` | `CreatePublicReservationDto` | `201` `PublicReservationCreatedDto` (**bez** `Location`) | `409 RESERVATION_OVERLAP`, `422 …` |
| `GET` | `/public/reservations/:token` | – | `200` `PublicReservationDto` | `404` |
| `POST` | `/public/reservations/:token/cancel` | `{ reason? }` (≤ 500) | `200` `PublicReservationDto` | `422 CANCELLATION_DEADLINE_PASSED`, `409 INVALID_STATUS_TRANSITION` |

**DTO**

- `PublicPropertyDto`: `name`, `slug`, `description`, `street`, `postalCode`, `city`, `phone`, `contactEmail`, `checkInTime`, `checkOutTime`, `cancellationDeadlineDays`, `pendingExpiryHours`, `currency`, `photos: PhotoDto[]`, `rooms: PublicRoomDto[]`. Bez `ownerId` i bez danych wewnętrznych.
- `PublicRoomDto`: `id`, `name`, `description`, `capacity`, `minNights`, `priceFrom` (min. z ceny bazowej i stawek z `dateTo ≥ today`), `photos`. Tylko pokoje aktywne.
- `AvailabilityResultDto`: `{ checkIn, checkOut, nights, guests, rooms: [{ room: PublicRoomDto, available, unavailableReason?: 'OCCUPIED' | 'CAPACITY_EXCEEDED' | 'MIN_NIGHTS_NOT_MET', minNights, totalPrice?, averagePricePerNight?, breakdown? }] }`. Zwraca wszystkie aktywne pokoje z powodem niedostępności, bo ekran P2 pokazuje pokoje niedostępne i informację o minimalnym pobycie. Cena tylko dla dostępnych.
- `PublicOccupancyDto`: `{ from, to, rooms: [{ roomId, occupiedNights: string[] }] }`, bez danych gości.
- `CreatePublicReservationDto`: `roomId`, `checkIn`, `checkOut`, `guestsCount`, `guest: { firstName (1–100), lastName (1–100), email (wymagany), phone (wymagany, ≤ 30) }`, `guestNotes?` (≤ 2000). Brak pola ceny (BR-05). Akceptacja regulaminu jest tylko po stronie UI.
- `PublicReservationCreatedDto`: `number`, `status` (`PENDING`), `room: { name }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `expiresAt`, `guestEmail`. **Bez tokenu:** link trafia wyłącznie do e-maila.
- `PublicReservationDto`: `number`, `status`, `property: { name, slug, phone, contactEmail, street, postalCode, city, checkInTime, checkOutTime }`, `room: { name, coverPhoto }`, `checkIn`, `checkOut`, `nights`, `guestsCount`, `totalPrice`, `currency`, `guestNotes`, `canCancel`, `cancellableUntil` (data lub `null`), `cancelledAt`. Bez `internalNotes`.

Wyjątek od konwencji `Location`: `POST /public/properties/:slug/reservations` nie zwraca `Location`, bo adres zasobu zawiera sekretny token.

## 6. Backend: zadania

- [ ] Moduł `public` (lub `guest-booking`): `PublicPropertiesController`, `PublicReservationsController`.
- [ ] `PublicPropertyQuery`: obiekt po `slug` (aktywny, nieusunięty) z pokojami, zdjęciami i `priceFrom`.
- [ ] Dostępność: `AvailabilityService` w trybie raportu dla wszystkich pokoi (kolizje jednym zapytaniem dla całego obiektu).
- [ ] `GuestBookingService.create`: transakcja → `FOR UPDATE` pokoju → `AvailabilityService` (assert) → upsert gościa po `(propertyId, email)` ([Q-04](../open-questions.md#q-04)) → numer → token (32 B) + hash → insert `PENDING` z `expiresAt = now + pendingExpiryHours` → `ReservationEvent(CREATED, GUEST)` → po commicie `ReservationCreated` z surowym tokenem.
- [ ] `GuestReservationService.get` i `cancel`: hash tokenu → rezerwacja; ważność ([Q-11](../open-questions.md#q-11)); BR-08 przez `cancellation-policy.ts`; `cancelledBy = GUEST`.
- [ ] Throttling per endpoint, a w logach maskowanie tokenu (pokazujemy tylko pierwsze 6 znaków).

## 7. Frontend: ekrany i zadania

Ekrany: P1–P5: [screens.md](../../apps/web/docs/screens.md). `PublicLayout`: marka obiektu, a w stopce „Rezerwacje obsługuje Klucznik”. Projekt mobile-first.

- [ ] `/o/:slug` (P1): hero z wyszukiwarką (zakres dat, goście), „O nas”, karty pokoi („do N osób”, „od X zł / noc”, „Zobacz terminy”), galeria, lokalizacja z godzinami, kontakt. Na mobile sticky przycisk „Sprawdź dostępność”.
- [ ] `/o/:slug/dostepnosc?checkIn&checkOut&guests` (P2): pasek podsumowania z „Zmień”, karty pokoi z ceną „1 640 zł za 4 noce (średnio 410 zł / noc)”, pokoje niedostępne przygaszone, komunikat o minimalnym pobycie, stan pusty „Brak wolnych pokoi w wybranym terminie – spróbuj innych dat”. Na desktopie mini-kalendarz zajętości (`/occupancy`).
- [ ] `/o/:slug/rezerwacja?roomId&checkIn&checkOut&guests` (P3): kroki „Termin → Dane → Potwierdzenie”, formularz (zod), checkbox regulaminu, sticky podsumowanie z rozbiciem ceny i polityką anulowania. Obsługa 409 (termin właśnie zajęty → powrót do wyników) i 422.
- [ ] `/o/:slug/rezerwacja/wyslana` (P4): numer, status „Oczekuje na potwierdzenie”, podsumowanie, informacja o czasie potwierdzenia (`pendingExpiryHours`) i e-mailu. Dane pochodzą z odpowiedzi mutacji (state routera), a odświeżenie strony przekierowuje na stronę obiektu.
- [ ] `/r/:token` (P5): karta rezerwacji, kontakt, sekcja anulowania („Możesz bezpłatnie anulować rezerwację do {cancellableUntil}”), modal potwierdzenia z powodem; po terminie tekst „Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem”; 404 → „Link jest nieaktualny…”.
- [ ] Ustaw `document.title` na nazwę obiektu i dodaj meta `description` (podstawowe SEO w SPA).

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| `GET /public/properties/:slug` nieaktywnego obiektu → 404 | int | BR-13 |
| Dostępność: pokój zajęty → `available: false, OCCUPIED`; za mało nocy → `MIN_NIGHTS_NOT_MET` | int | BR-01, BR-03 |
| Dostępność z `checkIn` w przeszłości → 422 | int | BR-04 |
| Utworzenie → 201 `PENDING`, `expiresAt`, e-mail w kolejce, brak tokenu w odpowiedzi | int | BR-07 |
| Body z `totalPrice` → 400 | int | BR-05 |
| Gość anuluje `CONFIRMED` po terminie → 422; przed terminem → 200 | int | BR-08 |
| Ponowne anulowanie → 409 | int | BR-06 |
| `cancellation-policy`: dzień terminu, dzień po, `PENDING` | unit | BR-08 |
| Formularz P3: walidacja, obsługa 409 | ui | BR-01 |
| P5: wariant przed i po terminie anulowania | ui | BR-08 |

## 9. Kryteria akceptacji

- [ ] Gość przechodzi P1 → P2 → P3 → P4 na telefonie (375 px) bez przewijania w poziomie.
- [ ] Po wysłaniu prośby właściciel widzi rezerwację `PENDING` w panelu, a gość dostaje e-mail z linkiem `/r/:token` (Mailpit).
- [ ] Link z e-maila pozwala anulować rezerwację tylko zgodnie z BR-08.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | Nie rozpoczęto |

Zdecydowane: [Q-04](../open-questions.md#q-04), [Q-17](../open-questions.md#q-17). Otwarte: [Q-11](../open-questions.md#q-11), [Q-16](../open-questions.md#q-16), [Q-19](../open-questions.md#q-19) (regulamin), [Q-20](../open-questions.md#q-20) (udogodnienia).
