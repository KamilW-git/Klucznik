# ADR 0008: Multi-tenancy przez własność obiektu (shared schema)

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** API

## Kontekst

Jedna instancja aplikacji obsługuje wielu właścicieli (model komercyjny). Właściciel nie może zobaczyć ani zmienić danych innego właściciela, w tym gości, którzy są danymi osobowymi. Admin ma pełny dostęp. Dane muszą być odizolowane bez komplikowania infrastruktury w MVP.

## Decyzja

- **Wspólna baza i wspólny schemat**. Tenantem jest właściciel (`User` z rolą `OWNER`), granicą izolacji jest `Property.ownerId`.
- Każdy zasób panelu jest osiągalny z obiektu: `Room.propertyId`; `Reservation.propertyId` i `Guest.propertyId` (zdenormalizowane wprost); `Photo.propertyId` (także dla zdjęć pokoi); `SeasonalRate` i `AvailabilityBlock` przez pokój.
- Goście (`Guest`) są przypisani do obiektu (`UNIQUE(propertyId, email)`). Ten sam człowiek u dwóch właścicieli to dwa rekordy.
- Kontrola dostępu w **serwisie aplikacyjnym**:
  - repozytoria przyjmują `AccessScope` (`{ userId, role }`) i dla `OWNER` dodają warunek `property.ownerId = userId`,
  - brak rekordu w zakresie → `NotFoundError` → 404 (BR-12), bez ujawniania istnienia,
  - `ADMIN` → zakres bez filtra.
- Role sprawdza `RolesGuard` (403) **przed** logiką.
- Każdy endpoint panelu ma test integracyjny izolacji (owner B → zasób ownera A → 404).

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Schemat per tenant | silna izolacja | migracje × N, złożony connection routing |
| Baza per tenant | najsilniejsza izolacja | koszt i operacje nieadekwatne do skali |
| PostgreSQL Row-Level Security | izolacja wymuszona przez bazę | trudniejsze z Prismą (ustawianie zmiennych sesji per transakcja); kandydat na rozszerzenie |
| Sprawdzanie w kontrolerze | proste | rozproszone, łatwo pominąć; łamie zasadę „brak logiki w kontrolerze” |

## Konsekwencje

- **Pozytywne:** prosta infrastruktura, jedno miejsce kontroli dostępu (łatwe rozszerzenie o pracowników obiektu), czytelne na obronie.
- **Negatywne:** izolacja zależy od dyscypliny w repozytoriach, więc obowiązkowe są testy izolacji i checklista endpointu ([apps/api/AGENTS.md](../../apps/api/AGENTS.md)).
- **Wpływ:** [security.md](../architecture/security.md#autoryzacja), [application-layer.md](../../apps/api/docs/application-layer.md#polityki-dostępu), [business-rules.md](../architecture/business-rules.md#br-12).
