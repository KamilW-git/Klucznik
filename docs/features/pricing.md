# Funkcjonalność: Cennik (ceny bazowe i sezonowe)

> Stawki sezonowe pokoi i algorytm wyliczania ceny pobytu, z którego korzystają dostępność i rezerwacje.
> Etapy: M6 (API), M11 (UI). Konwencje kwot i zakresów: [ADR 0007](../decisions/0007-money-and-dates.md).

## 1. Cel i wartość dla użytkownika

Ceny noclegów zmieniają się w sezonie, w długie weekendy i w Sylwestra. Właściciel definiuje stawki raz, a system sam liczy cenę każdego pobytu noc po nocy, bez błędów i bez możliwości manipulacji ceną przez klienta.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę ustawić cenę bazową za noc i minimalny pobyt pokoju.
- Jako **właściciel** chcę dodać stawkę „Wysoki sezon” z inną ceną i minimalnym pobytem, aby zarabiać więcej w szczycie.
- Jako **gość** chcę zobaczyć cenę całkowitą i rozbicie na noce przed rezerwacją.

## 3. Reguły biznesowe

- [BR-05](../architecture/business-rules.md#br-05): cenę liczy tylko serwer, a w rezerwacji jest zamrożona.
- [BR-03](../architecture/business-rules.md#br-03): `minNights` stawki obowiązującej w noc przyjazdu.
- [BR-09](../architecture/business-rules.md#br-09): stawki pokoju nie nakładają się.
- [BR-12](../architecture/business-rules.md#br-12).

## 4. Model danych

[SeasonalRate](../architecture/data-model.md#seasonalrate-stawka-sezonowa); `Room.basePricePerNight` i `Room.minNights` edytowane przez [rooms.md](rooms.md).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/rooms/:id/rates` | `OWNER`, `ADMIN` | query: `from?`, `to?` | `200` `{ data: SeasonalRateDto[] }` (sort `dateFrom:asc`) | `404` |
| `POST` | `/rooms/:id/rates` | `OWNER`, `ADMIN` | `CreateSeasonalRateDto` | `201` `SeasonalRateDto` + `Location: /api/v1/rates/:id` | `409 SEASONAL_RATE_OVERLAP` |
| `PATCH` | `/rates/:id` | `OWNER`, `ADMIN` | `UpdateSeasonalRateDto` | `200` `SeasonalRateDto` | `409 SEASONAL_RATE_OVERLAP` |
| `DELETE` | `/rates/:id` | `OWNER`, `ADMIN` | – | `204` | – |

| Pole | Walidacja |
|-|-|
| `name` | 1–80 znaków |
| `dateFrom`, `dateTo` | `YYYY-MM-DD`, `dateTo ≥ dateFrom` (inaczej 400), zakres ≤ 366 nocy |
| `pricePerNight` | int ≥ 0 (grosze) |
| `minNights` | int 1–30 lub `null` (wtedy obowiązuje `Room.minNights`) |

**`SeasonalRateDto`**: `id`, `roomId`, `name`, `dateFrom`, `dateTo`, `pricePerNight`, `minNights`, `currency`.

Zmiana lub usunięcie stawki nie wpływa na istniejące rezerwacje (BR-05). Dozwolone są także stawki w przeszłości (historia).

## Algorytm ceny (domena)

`calculatePrice(stay, basePricePerNight, rates) → { nights, total, breakdown: [{ date, price, rateId | null }] }`:

1. Dla każdej nocy `n` w `[checkIn, checkOut)`:
2. znajdź stawkę z `dateFrom ≤ n ≤ dateTo`. Dzięki BR-09 jest co najwyżej jedna,
3. `price(n) = stawka?.pricePerNight ?? basePricePerNight`,
4. `total = Σ price(n)` (grosze, bez zaokrągleń).

`resolveMinNights(room, rates, checkIn) = rateCovering(checkIn)?.minNights ?? room.minNights`.
Implementacja: `apps/api/src/modules/pricing/domain/`, z czystych funkcji korzystają `availability` i `reservations`.

## 6. Backend: zadania

- [ ] Moduł `pricing`: `domain/calculate-price.ts`, `domain/min-nights.ts` (+ testy); zakresy włączne z `common/domain/date-range.ts`.
- [ ] `RatesController`, `RatesService` (BR-09 przed zapisem), `RatesRepository`.
- [ ] Migracja: `EXCLUDE` dla `seasonal_rates` ([data-model.md](../architecture/data-model.md#seasonalrate-stawka-sezonowa)); mapowanie `23P01` → `SeasonalRateOverlapError`.
- [ ] `details` błędu BR-09: `conflictingRateId`, `conflictingRateName`.
- [ ] Eksport `PricingFacade` (port) dla innych modułów: `quote(roomId, stay)`.

## 7. Frontend: ekrany i zadania

Ekrany: O7 zakładka „Cennik”: [screens.md](../../apps/web/docs/screens.md).

- [ ] Pola „Cena bazowa za noc” i „Minimalna liczba nocy” (zapis przez `PATCH /rooms/:id`).
- [ ] Tabela stawek („Nazwa”, „Od”, „Do”, „Cena za noc”, „Min. nocy”, akcje); „+ Dodaj stawkę sezonową” w dialogu.
- [ ] Pasek roku z sezonami w kolorach (wizualizacja zakresów).
- [ ] Błąd `SEASONAL_RATE_OVERLAP` → „Ta stawka nakłada się na stawkę „{conflictingRateName}””.
- [ ] Daty „Od–Do” w UI oznaczają noce włącznie (podpowiedź pod polem: „ostatnia noc objęta stawką”).

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Tylko cena bazowa: 4 noce × 380 zł = 152 000 gr | unit | BR-05 |
| Pobyt na przełomie sezonu (2 × base + 2 × sezon) | unit | BR-05 |
| Noc `dateTo` stawki jest objęta stawką (zakres włączny) | unit | BR-05 |
| `minNights` z sezonu tylko wtedy, gdy obejmuje noc przyjazdu | unit | BR-03 |
| `inclusiveRangesOverlap`: styk (31.08 / 01.09) nie koliduje; wspólna noc koliduje | unit | BR-09 |
| `POST` nakładającej się stawki → 409 | int | BR-09 |
| Zmiana stawki nie zmienia `totalPrice` istniejącej rezerwacji | int | BR-05 |

## 9. Kryteria akceptacji

- [ ] Cena w wynikach dostępności, formularzu rezerwacji i rezerwacji zapisanej jest identyczna.
- [ ] Nie da się zapisać nakładających się stawek (także przy równoczesnych żądaniach, dzięki constraintowi).

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | Nie rozpoczęto |

Brak otwartych kwestii.
