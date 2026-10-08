# Warstwa domeny (`modules/*/domain`, `common/domain`)

> Czysta logika biznesowa: reguły BR, maszyna stanów, wyliczanie ceny, value objects, błędy domenowe, `Clock`. Czytaj przy implementacji lub zmianie reguły.
> Katalog reguł: [business-rules.md](../../../docs/architecture/business-rules.md).

## Zasady

- **Czysty TypeScript:** zero importów z `@nestjs/*`, `@prisma/client`, `express`. Dozwolone: inne pliki `domain/`, `common/domain/`, małe biblioteki bez efektów ubocznych (np. `date-fns`).
- Brak I/O: funkcje dostają dane jako argumenty i zwracają wynik albo rzucają `DomainError`.
- Brak `new Date()` i `Date.now()`: czas przychodzi jako argument (`now`, `today`).
- Każda funkcja realizująca regułę ma komentarz `// BR-xx` i test `*.spec.ts` obok.

## Mapa plików

| Plik | Zawartość | Reguły |
|-|-|-|
| `common/domain/calendar-date.ts` | value object `CalendarDate` (`parse`, `fromInstant(date, timeZone)`, `addDays`, `diffDays`, `compare`, `isBefore`/`isAfter`, `dayOfWeek`, `isWeekend`) | – |
| `common/domain/stay-range.ts` | `StayRange.of [checkIn, checkOut)` (wyjazd po przyjeździe), `nights()`, `eachNight()`, `toNightsRange()`, `overlaps`, `overlapsBlock`, `assertStayDates(range, today, { allowPastCheckInDays })` | BR-01, BR-04 |
| `common/domain/date-range.ts` | `InclusiveDateRange.of [from, to]`, `nights()`, `contains`, `inclusiveRangesOverlap` | BR-01, BR-09 |
| `common/domain/clock.ts` | interfejs `Clock`, token `CLOCK`, `FixedClock` (testy: `at`, `advanceBy`, `setTo`) | – |
| `common/domain/domain-error.ts` | klasa bazowa `DomainError`, unia `DomainErrorCode` | – |
| `common/domain/errors/invalid-stay-dates.error.ts` | `InvalidStayDatesError` z `reason` | BR-04 |
| `infrastructure/clock/system-clock.ts` | `SystemClock` (adapter produkcyjny, `ClockModule`) | – |
| `common/domain/errors/has-future-reservations.error.ts` | `HasFutureReservationsError`, `assertNoFutureReservations(count)` (obiekty i pokoje) | BR-10 |
| `modules/photos/domain/image-type.ts` | `detectImageType(bytes)` po sygnaturze (JPEG, PNG, WebP) | – |
| `modules/photos/domain/photo-order.ts` | `moveToPosition(ids, id, position)`, `PHOTO_LIMIT` | Q-14 |
| `modules/pricing/domain/calculate-price.ts` | `calculatePrice` | BR-05 |
| `modules/pricing/domain/min-nights.ts` | `resolveMinNights`, `assertMinNights` | BR-03 |
| `modules/reservations/domain/reservation-status.ts` | enum, tabela przejść, `assertTransition`, `isExpired` | BR-06, BR-07 |
| `modules/reservations/domain/reservation-policy.ts` | `assertCapacity`, `assertBookable` | BR-02, BR-13 |
| `modules/reservations/domain/cancellation-policy.ts` | `guestCancellationDeadline`, `assertGuestCanCancel` | BR-08 |
| `modules/reservations/domain/reservation-number.ts` | `formatReservationNumber(year, seq)` | – |
| `modules/properties/domain/slug.ts` | `slugify` (transliteracja PL) | – |

## Błędy domenowe

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;            // np. 'RESERVATION_OVERLAP'
  constructor(message: string, readonly details?: Record<string, unknown>) { super(message); }
}

export class CapacityExceededError extends DomainError {
  readonly code = 'CAPACITY_EXCEEDED';       // BR-02
}
```

- Jedna klasa na kod błędu, w `modules/<f>/domain/errors/` (lub `common/domain/errors/` dla współdzielonych).
- `message` po polsku (trafia do odpowiedzi jako pomocniczy), a `details` to dane dla UI (np. `minNights`).
- Domena **nie zna** kodów HTTP. Mapę `code → status` ma globalny filtr ([http-layer.md](http-layer.md#mapowanie-błędów)).

| Klasa | `code` |
|-|-|
| `ReservationOverlapError` | `RESERVATION_OVERLAP` |
| `BlockOverlapsReservationError` | `BLOCK_OVERLAPS_RESERVATION` |
| `CapacityExceededError` | `CAPACITY_EXCEEDED` |
| `MinNightsNotMetError` | `MIN_NIGHTS_NOT_MET` |
| `InvalidStayDatesError` | `INVALID_STAY_DATES` |
| `InvalidStatusTransitionError` | `INVALID_STATUS_TRANSITION` |
| `ReservationNotEditableError` | `RESERVATION_NOT_EDITABLE` |
| `CancellationDeadlinePassedError` | `CANCELLATION_DEADLINE_PASSED` |
| `SeasonalRateOverlapError` | `SEASONAL_RATE_OVERLAP` |
| `HasFutureReservationsError` | `HAS_FUTURE_RESERVATIONS` |
| `VersionConflictError` | `VERSION_CONFLICT` |
| `RoomNotBookableError` | `ROOM_NOT_BOOKABLE` |
| `PhotoLimitReachedError` | `PHOTO_LIMIT_REACHED` |

`NotFoundError` (BR-12) jest błędem aplikacyjnym, nie domenowym, i leży w `common/errors/`.

## Maszyna stanów

Tabela przejść jako dane, a nie zbiór `if`-ów:

```ts
const TRANSITIONS: ReadonlyArray<{ from: Status; to: Status; actors: ActorType[] }> = [
  { from: 'PENDING',   to: 'CONFIRMED', actors: ['OWNER', 'ADMIN'] },
  { from: 'PENDING',   to: 'CANCELLED', actors: ['GUEST', 'OWNER', 'ADMIN'] },
  { from: 'PENDING',   to: 'EXPIRED',   actors: ['SYSTEM'] },
  { from: 'CONFIRMED', to: 'CANCELLED', actors: ['GUEST', 'OWNER', 'ADMIN'] }, // GUEST: dodatkowo BR-08
  { from: 'CONFIRMED', to: 'COMPLETED', actors: ['SYSTEM'] },
];
```

Diagram i skutki przejść: [data-model.md](../../../docs/architecture/data-model.md#maszyna-stanów-rezerwacji).

## Clock

```ts
export interface Clock {
  now(): Date;               // chwila (UTC)
  today(): CalendarDate;     // data w APP_TIMEZONE (Europe/Warsaw)
}
export const CLOCK = Symbol('CLOCK');
```

- Implementacja produkcyjna `SystemClock` (w `infrastructure/`) liczy `today()` przez `Intl.DateTimeFormat('en-CA', { timeZone })`.
- `FixedClock.at('2026-08-01T10:00:00+02:00')` w testach jednostkowych i integracyjnych (nadpisanie providera `CLOCK`).
- Uwaga na granicę doby: 23:30 UTC 31.07 to już 01.08 w Warszawie (test obowiązkowy).

## Testy jednostkowe

- Jest, bez `Test.createTestingModule`. Zwykłe wywołania funkcji.
- Testy graniczne są obowiązkowe: styk dni, dzień terminu anulowania, 365 dni, 30 nocy, `expiresAt == now`.
- Tabelaryczne `it.each` dla maszyny stanów i cen.
- Nazwy z ID reguły: [testing-strategy.md](../../../docs/architecture/testing-strategy.md#nazewnictwo-testów-z-id-reguł).
