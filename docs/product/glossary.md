# Słownik pojęć PL ↔ EN

> **Obowiązujący** słownik nazewnictwa. Polskie terminy stosuj w UI i dokumentacji, angielskie w kodzie, API i bazie.
> Nowe pojęcie dodaj tutaj, zanim użyjesz go w kodzie.

## Aktorzy i role

| PL | EN (kod) | Uwagi |
|-|-|-|
| Gość | Guest | osoba rezerwująca; encja `Guest` przypisana do obiektu |
| Właściciel, Gospodarz | Owner, rola `OWNER` | `User` z rolą `OWNER`; w UI „Gospodarz” |
| Administrator | Admin, rola `ADMIN` | `User` z rolą `ADMIN` |
| Użytkownik | User | konto z logowaniem (tylko `OWNER` i `ADMIN`) |
| Panel Gospodarza | owner panel | obszar `/panel` aplikacji web |
| Panel admina | admin panel | obszar `/admin` aplikacji web |
| Strona obiektu | public property page | obszar `/o/:slug`, white-label |

## Zasoby

| PL | EN (kod) | Uwagi |
|-|-|-|
| Obiekt (noclegowy) | Property | pensjonat, ośrodek domków itp. |
| Pokój / domek | Room | jednostka rezerwacji |
| Zdjęcie | Photo | obiektu lub pokoju |
| Zdjęcie główne | cover photo | zdjęcie z `sortOrder = 0` |
| Cena bazowa (za noc) | base price, `basePricePerNight` | w groszach |
| Stawka sezonowa | SeasonalRate | cena za noc w zakresie dat |
| Cennik | pricing | cena bazowa + stawki sezonowe |
| Blokada terminu | AvailabilityBlock | np. remont, użytek własny |
| Rezerwacja | Reservation | |
| Numer rezerwacji | reservation number, `number` | format `KL-RRRR-NNNNNN` |
| Historia rezerwacji | ReservationEvent | wpisy timeline'u ([Q-05](../open-questions.md#q-05)) |
| Log e-maili | EmailLog | |
| Token gościa | guest access token | sekret w linku do zarządzania rezerwacją |
| Link do zarządzania rezerwacją | manage link | `/r/:token` w aplikacji web |

## Pobyt i dostępność

| PL | EN (kod) | Uwagi |
|-|-|-|
| Przyjazd (data) | check-in, `checkIn` | pierwsza noc pobytu |
| Wyjazd (data) | check-out, `checkOut` | dzień wyjazdu, **nie** jest nocą pobytu |
| Pobyt | stay | zakres `[checkIn, checkOut)` |
| Noc | night | data D oznacza noc z D na D+1 |
| Liczba nocy | nights | `checkOut − checkIn` |
| Liczba gości | `guestsCount` | |
| Pojemność | `capacity` | maks. liczba osób w pokoju |
| Minimalna liczba nocy | `minNights` | |
| Dostępność | availability | czy pokój jest wolny w danym zakresie |
| Kolizja, nakładanie się | overlap | |
| Kalendarz obłożenia | calendar | widok rezerwacji i blokad wszystkich pokoi |
| Obłożenie | occupancy | % zajętych nocy |
| Godzina zameldowania / wymeldowania | `checkInTime` / `checkOutTime` | format `HH:mm` |
| Dziś | today | data w strefie `Europe/Warsaw` z `Clock` |

## Rezerwacje: statusy, źródła, akcje

| PL (UI) | EN (kod) | Uwagi |
|-|-|-|
| Oczekuje (na potwierdzenie) | `PENDING` | badge bursztynowy |
| Potwierdzona | `CONFIRMED` | badge zielony |
| Anulowana | `CANCELLED` | badge czerwono-szary |
| Wygasła | `EXPIRED` | badge szary |
| Zakończona | `COMPLETED` | badge niebiesko-szary |
| Online | `ONLINE` (`source`) | utworzona przez gościa na stronie obiektu |
| Ręczna | `MANUAL` (`source`) | dodana przez właściciela, np. telefonicznie |
| Potwierdź | confirm | `PENDING → CONFIRMED` |
| Odrzuć | cancel (przez właściciela) | w UI dla `PENDING`; technicznie `cancel` z `cancelledBy = OWNER` |
| Anuluj | cancel | `→ CANCELLED` |
| Wygaśnięcie | expire | `PENDING → EXPIRED`, wykonuje scheduler |
| Zakończenie pobytu | complete | `CONFIRMED → COMPLETED`, wykonuje scheduler |
| Kto anulował | `cancelledBy` | `GUEST` / `OWNER` / `ADMIN` / `SYSTEM` |
| Powód anulowania | `cancellationReason` | |
| Uwagi gościa | `guestNotes` | widoczne dla gościa i właściciela |
| Notatka wewnętrzna | `internalNotes` | widoczna tylko w panelu |
| Polityka anulowania | `cancellationDeadlineDays` | bezpłatne anulowanie do X dni przed przyjazdem |
| Czas na potwierdzenie | `pendingExpiryHours` | po tym czasie `PENDING` wygasa |
| Termin ważności rezerwacji oczekującej | `expiresAt` | |
| Cena całkowita | `totalPrice` | w groszach, zamrożona przy utworzeniu |
| Grosz | minor unit | 1 zł = 100 gr |
| Przypomnienie | reminder | e-mail przed przyjazdem |

## Pojęcia techniczne

| PL | EN | Uwagi |
|-|-|-|
| Reguła biznesowa | business rule, `BR-xx` | [business-rules.md](../architecture/business-rules.md) |
| Izolacja danych | tenant isolation, ownership | BR-12 |
| Zdarzenie domenowe | domain event | np. `ReservationConfirmed` |
| Kolejka | queue | BullMQ |
| Zadanie cykliczne | scheduled job | `@nestjs/schedule` |
| Blokada optymistyczna | optimistic locking | pole `version` (BR-11) |
| Usuwanie miękkie | soft delete | pole `deletedAt` |
| Kontrakt API | API contract | `packages/api-client/openapi.json` |
| Zgłoszenie między warstwami | handoff | [handoff.md](../handoff.md) |
| Port / adapter | port / adapter | interfejs w `application`, implementacja w `infrastructure` |
