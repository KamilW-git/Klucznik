# Konwencje REST API

> Zasady obowiązujące wszystkie endpointy: ścieżki, metody, kody, format błędu, paginacja, sortowanie, filtrowanie, daty, kwoty, wersjonowanie, OpenAPI.
> Czytaj przed dodaniem lub zmianą endpointu (sesje `API`) i przy obsłudze błędów (sesje `UI`). Implementacja w NestJS: [http-layer.md](../../apps/api/docs/http-layer.md).

## Ścieżki i wersjonowanie

- Prefiks: `/api/v1`. Zmiana łamiąca kontrakt oznacza `/api/v2`, a do tego czasu tylko zmiany wstecznie zgodne.
- Rzeczowniki w liczbie mnogiej, kebab-case: `/properties/:propertyId/rooms`, `/admin/email-logs`.
- Zagnieżdżanie maks. 1 poziom, tylko przy tworzeniu i listowaniu w kontekście rodzica (`POST /properties/:propertyId/rooms`). Operacje na pojedynczym zasobie idą po jego id (`PATCH /rooms/:id`).
- Akcje zmieniające stan, których nie da się wyrazić jako CRUD: `POST /reservations/:id/confirm`, `POST /reservations/:id/cancel`.
- Endpointy publiczne (bez logowania): `/public/**`, `/files/**`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/health`.
- Pola JSON w camelCase. Identyfikatory to UUID, walidowane `ParseUUIDPipe` (zły format → 400).

## Metody i kody odpowiedzi

| Operacja | Metoda | Sukces |
|-|-|-|
| Lista | `GET` | `200` + `{ data, meta }` |
| Szczegóły | `GET` | `200` |
| Utworzenie | `POST` | `201` + nagłówek `Location: /api/v1/<zasób>/<id>` + DTO |
| Częściowa edycja | `PATCH` | `200` + zaktualizowane DTO |
| Usunięcie | `DELETE` | `204` bez treści |
| Akcja (`confirm`, `cancel`) | `POST` | `200` + zaktualizowane DTO |

| Kod | Kiedy | `code` |
|-|-|-|
| `400` | błąd walidacji DTO, nieznane pole, zły UUID | `VALIDATION_ERROR` |
| `401` | brak lub nieważny access token, złe dane logowania | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| `403` | brak wymaganej roli (BR-12) | `FORBIDDEN` |
| `404` | brak zasobu **lub** zasób innego właściciela (BR-12) | `NOT_FOUND` |
| `409` | konflikt stanu: nakładanie się, wersja, przejście statusu, unikalność | patrz [business-rules.md](business-rules.md#podsumowanie), `EMAIL_TAKEN`, `SLUG_TAKEN`, `RESERVATION_NOT_EDITABLE`, `BLOCK_OVERLAPS_RESERVATION`, `CONFLICT` (ogólny, awaryjny) |
| `413` | plik za duży | `FILE_TOO_LARGE` |
| `415` | niedozwolony typ pliku | `UNSUPPORTED_FILE_TYPE` |
| `422` | poprawne dane naruszające regułę biznesową | patrz [business-rules.md](business-rules.md#podsumowanie), `PHOTO_LIMIT_REACHED` |
| `429` | przekroczony limit żądań | `RATE_LIMITED` |
| `500` | nieoczekiwany błąd (bez szczegółów w odpowiedzi) | `INTERNAL_ERROR` |

Rozróżnienie **400 i 422**: 400 oznacza, że dane mają zły kształt (typ, format, brak pola). 422 oznacza, że dane są poprawne, ale łamią regułę biznesową (np. za dużo gości).

## Format błędu

Każdy błąd zwraca **globalny filtr wyjątków** w jednym formacie:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "RESERVATION_OVERLAP",
  "message": "Wybrany termin koliduje z inną rezerwacją.",
  "details": { "conflictingReservationNumber": "KL-2026-000118" },
  "path": "/api/v1/properties/2b1…/reservations",
  "timestamp": "2026-08-01T10:15:30.000Z",
  "requestId": "6f0c…"
}
```

| Pole | Opis |
|-|-|
| `statusCode`, `error` | kod HTTP i jego nazwa |
| `code` | stabilny kod maszynowy w `UPPER_SNAKE_CASE`. **UI rozpoznaje błędy wyłącznie po `code`** |
| `message` | komunikat po polsku (pomocniczy; UI ma własne tłumaczenia) |
| `details` | opcjonalny obiekt; dla `VALIDATION_ERROR`: `{ "fields": [{ "field": "email", "messages": ["…"] }] }` |
| `path`, `timestamp` | ścieżka żądania, czas ISO 8601 UTC |
| `requestId` | z nagłówka `X-Request-Id` albo wygenerowany; zwracany też w nagłówku odpowiedzi i logach |

Kody reguł biznesowych są w [business-rules.md](business-rules.md#podsumowanie). Kody ogólne są w tabeli wyżej. Nowy kod dopisz w odpowiednim z tych dwóch miejsc.
Mapowanie błąd domenowy → HTTP odbywa się w jednym miejscu: [http-layer.md](../../apps/api/docs/http-layer.md#mapowanie-błędów).

## Paginacja

- Parametry: `?page=1&pageSize=20`. `page` ≥ 1 (domyślnie 1), `pageSize` 1–100 (domyślnie 20). Wartość spoza zakresu → 400.
- Odpowiedź:

```json
{ "data": [ … ], "meta": { "page": 1, "pageSize": 20, "totalItems": 134, "totalPages": 7 } }
```

- Endpointy z paginacją: `GET /reservations`, `GET /admin/owners`, `GET /admin/properties`, `GET /admin/email-logs`, `GET /properties/:id/guests`. Pozostałe listy (pokoje, stawki, blokady) są małe i zwracają `{ data }` bez `meta`.

## Sortowanie

- `?sort=field:asc` lub `?sort=field:desc`, wiele pól po przecinku: `?sort=checkIn:asc,number:desc`.
- Dozwolone pola są białą listą zdefiniowaną per endpoint i opisaną w Swaggerze. Nieznane pole → 400.
- Domyślne sortowanie podaje dokument funkcjonalności (np. rezerwacje: `checkIn:asc`).

## Filtrowanie i wyszukiwanie

- Filtry jako parametry query o nazwach pól: `?status=PENDING,CONFIRMED&roomId=…`. Wiele wartości oddzielamy przecinkiem.
- Zakresy dat: `?from=YYYY-MM-DD&to=YYYY-MM-DD`. Semantyka jest opisana per endpoint (np. pobyty przecinające zakres).
- Wyszukiwanie pełnotekstowe: `?q=…` (case-insensitive, `ILIKE`, min. 2 znaki).

## Daty, czas, kwoty

| Typ | Format w API | Przykład |
|-|-|-|
| Data (pobyt, stawka, blokada) | `YYYY-MM-DD` | `"2026-08-14"` |
| Znacznik czasu | ISO 8601 UTC | `"2026-08-01T10:15:30.000Z"` |
| Godzina | `HH:mm` | `"15:00"` |
| Kwota | liczba całkowita w groszach + `currency` | `"totalPrice": 164000, "currency": "PLN"` |

Szczegóły i uzasadnienie: [ADR 0007](../decisions/0007-money-and-dates.md). Formatowanie po polsku („1 640 zł”, „14.08.2026”) robi wyłącznie frontend.

## Bezpieczeństwo w kontrakcie

- Chronione endpointy wymagają `Authorization: Bearer <accessToken>`; refresh token jest w ciasteczku httpOnly: [security.md](security.md).
- `/public/**` i `/auth/login` mają osobne, ostrzejsze limity żądań: [security.md](security.md#rate-limiting).
- Odpowiedzi nigdy nie zawierają `passwordHash`, `tokenHash`, `guestAccessTokenHash` ani `internalNotes` w endpointach publicznych.

## OpenAPI

- Swagger UI: `/api/docs`, JSON: `/api/docs-json` (tylko gdy `SWAGGER_ENABLED=true`, domyślnie w dev).
- Każdy endpoint ma: `@ApiTags` (moduł), `@ApiOperation` (opis po polsku), odpowiedzi sukcesu i błędów z DTO `ErrorResponseDto`, `@ApiBearerAuth` dla chronionych.
- `operationId` = `<Controller>_<method>`, np. `Reservations_confirm`. Te nazwy tworzą nazwy hooków orval, więc nie zmieniaj ich bez potrzeby.
- Kontrakt eksportowany do `packages/api-client/openapi.json`: [ADR 0006](../decisions/0006-openapi-contract-codegen.md).

## Indeks endpointów

Szczegóły (request, response, role, błędy) są w dokumentach funkcjonalności:

| Grupa | Dokument |
|-|-|
| `/auth/*` | [auth.md](../features/auth.md) |
| `/admin/owners*`, `/admin/properties`, `/admin/email-logs` | [admin-owners.md](../features/admin-owners.md) |
| `/properties*`, `/properties/:id/dashboard` | [properties.md](../features/properties.md) |
| `/properties/:id/rooms`, `/rooms/:id` | [rooms.md](../features/rooms.md) |
| `/…/photos`, `/photos/:id`, `/files/:storageKey` | [photos.md](../features/photos.md) |
| `/rooms/:id/rates`, `/rates/:id` | [pricing.md](../features/pricing.md) |
| `/rooms/:id/blocks`, `/blocks/:id`, `/properties/:id/calendar` | [availability.md](../features/availability.md) |
| `/reservations*`, `/properties/:id/reservations` | [reservations.md](../features/reservations.md) |
| `/public/**` | [guest-booking.md](../features/guest-booking.md) |
| `/properties/:id/guests` | [guests.md](../features/guests.md) |
| `/health` | [infrastructure.md](infrastructure.md) |
