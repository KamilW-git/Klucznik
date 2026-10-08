# Handoff: zgłoszenia między warstwami

> Kolejka próśb, gdy sesja jednej warstwy potrzebuje zmiany w innej (np. UI potrzebuje nowego pola w odpowiedzi API). Czytaj na starcie każdej sesji (krok 3 protokołu): wpisy `OPEN` skierowane do Twojego trybu.
> Zasada: **nie zmieniaj cudzego kodu**. Dopisz wpis, kontynuuj na mocku albo z TODO i zamknij wpis, gdy zmiana jest gotowa.

## Format

| Pole | Opis |
|-|-|
| ID | `H-NNN`, kolejny numer |
| Data | `RRRR-MM-DD` utworzenia |
| Od → Do | tryb zgłaszający → tryb realizujący (`API`, `UI`, `INFRA`, `DOCS`) |
| Co | konkretna zmiana (endpoint, pole, typ, plik) |
| Dlaczego | kontekst i link do dokumentu funkcjonalności lub ekranu |
| Status | `OPEN` → `IN_PROGRESS` → `DONE` (z hashem commita) lub `REJECTED` (z uzasadnieniem) |

Zasady:

- Jeden wpis to jedna zmiana. Większe potrzeby rozbij na kilka wpisów.
- Sesja realizująca zmienia status i dopisuje commit lub uzasadnienie. Wpisów nie usuwamy.
- Zmiana kontraktu API oznacza, że po `DONE` sesja `UI` regeneruje klienta ([packages/api-client/AGENTS.md](../packages/api-client/AGENTS.md)).
- Jeśli zgłoszenie zmienia wymagania lub zachowanie, najpierw aktualizacja dokumentu funkcjonalności (sesja `DOCS` lub realizująca).

## Przykład (nie jest prawdziwym zgłoszeniem)

| ID | Data | Od → Do | Co | Dlaczego | Status |
|-|-|-|-|-|-|
| H-000 | 2026-10-08 | UI → API | Dodać `guest.phone` do `ReservationListItemDto` | Kolumna telefonu w tabeli O4 ([reservations.md](features/reservations.md)) | `REJECTED`: przykład formatu |

## Zgłoszenia

| ID | Data | Od → Do | Co | Dlaczego | Status |
|-|-|-|-|-|-|
| | | | | | |
