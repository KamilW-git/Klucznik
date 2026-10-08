# ADR 0007: Kwoty w groszach, daty pobytu jako DATE, zakresy i strefa czasowa

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** całość

## Kontekst

Ceny i daty to najczęstsze źródło błędów w systemach rezerwacji: zaokrąglenia floatów, przesunięcia dat o strefę czasową, niejednoznaczne „do” w zakresach. Reguły BR-01, BR-03, BR-04, BR-05 i BR-08 zależą od precyzyjnej arytmetyki dat i kwot.

## Decyzja

**Kwoty**

- Liczby całkowite w **groszach** (`Int`), np. 410,00 zł = `41000`. Nigdy float ani `Decimal` w logice.
- Waluta w osobnym polu (`currency`, ISO 4217, w MVP zawsze `PLN`): `Property.currency` dla cennika, `Reservation.currency` jako kopia przy utworzeniu.
- API przesyła grosze. Formatowanie „1 640 zł” robi tylko frontend (`Intl.NumberFormat('pl-PL')`).

**Daty**

- Daty pobytu, stawek i blokad: typ `DATE` w PostgreSQL, `YYYY-MM-DD` w API. W TypeScript to string `YYYY-MM-DD` opakowany w value object `CalendarDate` w domenie; nie używamy obiektu `Date` dla dat kalendarzowych.
- Znaczniki czasu (`createdAt`, `expiresAt`): `timestamptz`, w API ISO 8601 UTC.
- „Dziś” = bieżąca data w strefie **`Europe/Warsaw`**, pobierana z wstrzykiwanego `Clock` (`now(): Date`, `today(): CalendarDate`).

**Zakresy**

| Zakres | Semantyka | Przykład |
|-|-|-|
| Pobyt `[checkIn, checkOut)` | półotwarty; noce `checkIn … checkOut − 1` | `[14.08, 18.08)` = noce 14, 15, 16, 17 (4 noce) |
| Stawka sezonowa `[dateFrom, dateTo]` | noce **włącznie** | „Wysoki sezon” 01.07–31.08 obejmuje noc 31.08 |
| Blokada `[dateFrom, dateTo]` | noce **włącznie** | blokada 10.08–12.08 blokuje noce 10, 11, 12; przyjazd 13.08 możliwy |

Uzasadnienie podwójnej konwencji: dla pobytu naturalne jest „przyjazd–wyjazd” (dzień wyjazdu nie jest nocą), a dla cennika i blokad „od–do” wpisywane przez właściciela w UI oznacza ostatni dzień objęty zakresem. Konwersja jest w jednym miejscu: `apps/api/src/common/domain/stay-range.ts` (noce pobytu) i `date-range.ts` (zakresy włączne).

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| `Decimal(10,2)` | czytelność w bazie | konwersje w JS, ryzyko floatów po stronie klienta |
| `timestamptz` dla dat pobytu | jeden typ | przesunięcia strefowe zmieniające dzień |
| Wszystkie zakresy półotwarte | jedna konwencja | nieintuicyjne „do” w cenniku i blokadach dla właściciela |

## Konsekwencje

- **Pozytywne:** brak błędów zaokrągleń, deterministyczne testy (stały `Clock`), proste zapytania o nakładanie (`daterange` w PostgreSQL).
- **Negatywne:** UI musi konsekwentnie konwertować grosze i formatować daty (`shared/lib`); dwie konwencje zakresów wymagają dyscypliny i testów.
- **Wpływ:** [data-model.md](../architecture/data-model.md), [domain-layer.md](../../apps/api/docs/domain-layer.md), [api-conventions.md](../architecture/api-conventions.md#daty-czas-kwoty).
