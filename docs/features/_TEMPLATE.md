# Funkcjonalność: Nazwa

> Jedno zdanie: czego dotyczy dokument. Czytaj w sesjach `API` i `UI` realizujących tę funkcjonalność.
> Etapy: Mx (API), My (UI). Sekcje 5, 6, 8 aktualizuje sesja `API`; sekcję 7 sesja `UI`.

## 1. Cel i wartość dla użytkownika

2–4 zdania: jaki problem rozwiązuje i dla kogo.

## 2. Historyjki użytkownika

- Jako **<rola>** chcę **<co>**, aby **<po co>**.

## 3. Reguły biznesowe

Tylko odwołania, bez kopiowania treści: [BR-xx](../architecture/business-rules.md#br-xx).

## 4. Model danych

Encje, których dotyczy funkcjonalność, z linkami do [data-model.md](../architecture/data-model.md). Zmiany w modelu najpierw trafiają do `data-model.md`.

## 5. Kontrakt API

Konwencje: [api-conventions.md](../architecture/api-conventions.md). Kody ogólne (400, 401, 404 dla nieistniejącego lub cudzego zasobu) są pomijane, chyba że wymagają komentarza.

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `GET` | `/…` | `OWNER`, `ADMIN` | query: … | `200` `XDto` | … |

Opis DTO (pola, typy, walidacja), jeśli nie wynika z tabeli.

## 6. Backend: zadania

- [ ] …

## 7. Frontend: ekrany i zadania

Ekrany: [screens.md](../../apps/web/docs/screens.md).

- [ ] …

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| … | unit / int / ui | BR-xx |

## 9. Kryteria akceptacji

- [ ] …

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto / W toku / Gotowe |
| UI | Nie rozpoczęto / W toku / Gotowe |

Otwarte kwestie: linki do [open-questions.md](../open-questions.md).
