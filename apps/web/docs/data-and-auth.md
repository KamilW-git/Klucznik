# Dane i uwierzytelnianie we frontendzie

> Klient API (orval), TanStack Query, przepływ logowania i odświeżania tokenu oraz obsługa błędów API. Czytaj w M10 i przy każdej pracy z danymi z API.
> Kontrakt: [ADR 0006](../../../docs/decisions/0006-openapi-contract-codegen.md). Tokeny po stronie API: [security.md](../../../docs/architecture/security.md).

## Klient API

- Źródło: `@klucznik/api-client` (workspace). Zawiera wygenerowane typy, funkcje i hooki TanStack Query: [packages/api-client/AGENTS.md](../../../packages/api-client/AGENTS.md).
- Konfiguracja raz, w `apps/web/src/api/client.ts`:

```ts
configureApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  getAccessToken: () => tokenStore.get(),
  refresh: () => authService.refresh(),   // single-flight, zwraca nowy token lub null
  onUnauthorized: () => authService.logoutLocal(),
});
```

- Mutator (`packages/api-client/src/http/mutator.ts`) robi `fetch` z `credentials: 'include'` (cookie dla `/auth/*`), dokleja `Authorization` i parsuje błędy do `ApiError`.
- Nie piszemy własnych `fetch` do API. Brakujący endpoint zgłaszamy w [handoff.md](../../../docs/handoff.md).

## TanStack Query

| Ustawienie | Wartość |
|-|-|
| `staleTime` domyślny | 30 s (panel), 5 min (strona publiczna obiektu) |
| `retry` | 1 dla zapytań; 0 dla mutacji; brak ponowień dla 4xx |
| `refetchOnWindowFocus` | `true` w panelu (świeże rezerwacje), `false` w publicznym |
| Klucze | z orval (`getListReservationsQueryKey(params)`) |

- Po mutacji unieważniamy powiązane klucze (np. potwierdzenie rezerwacji → lista rezerwacji, szczegóły, kalendarz, pulpit). Każdy feature ma helper `invalidateReservations(queryClient)`.
- Optymistyczne aktualizacje tylko dla prostych, odwracalnych operacji (np. kolejność zdjęć). Rezerwacje zawsze czekają na odpowiedź serwera.
- Paginacja: `placeholderData: keepPreviousData`.

## Przepływ uwierzytelniania

```mermaid
sequenceDiagram
  participant App
  participant Auth as AuthProvider
  participant API
  App->>Auth: start aplikacji
  Auth->>API: POST /auth/refresh (cookie)
  alt cookie ważne
    API-->>Auth: 200 { accessToken, user }
    Auth->>Auth: tokenStore.set(token), status = authenticated
  else brak / nieważne
    API-->>Auth: 401
    Auth->>Auth: status = anonymous
  end
  App->>API: żądanie z Bearer
  API-->>App: 401 (token wygasł)
  App->>Auth: refresh() (jedno współdzielone żądanie)
  Auth->>API: POST /auth/refresh
  API-->>Auth: 200 nowy token
  App->>API: ponowienie żądania
```

| Element | Implementacja |
|-|-|
| `tokenStore` | zmienna w module (pamięć). Nie trafia do `localStorage` ani `sessionStorage` |
| `AuthProvider` | stan `{ status: 'loading' \| 'authenticated' \| 'anonymous', user }`, akcje `login`, `logout`, `refresh` |
| Single-flight refresh | trwający refresh jest współdzielony, a równoległe 401 czekają na ten sam `Promise` |
| Ponowienie | żądanie po 401 jest ponawiane raz. Drugie 401 albo nieudany refresh oznacza wylogowanie lokalne i przekierowanie do `/logowanie?next=…` |
| Proaktywny refresh | opcjonalnie timer na `expiresIn − 60 s` |
| Wylogowanie | `POST /auth/logout`, wyczyszczenie `tokenStore`, `queryClient.clear()`, przekierowanie |
| Wiele kart | `BroadcastChannel('kl-auth')` informuje inne karty o wylogowaniu |

## Obsługa błędów API

`ApiError` (z mutatora): `{ status, code, message, details, requestId }` zgodnie z [api-conventions.md](../../../docs/architecture/api-conventions.md#format-błędu).

**Mapa komunikatów** w `shared/lib/api-errors.ts`. Jedno miejsce, klucz to `code`:

| `code` | Komunikat (domyślny) |
|-|-|
| `VALIDATION_ERROR` | „Sprawdź poprawność formularza.” + błędy przy polach |
| `INVALID_CREDENTIALS` | „Nieprawidłowy e-mail lub hasło” |
| `RATE_LIMITED` | „Zbyt wiele prób. Spróbuj ponownie za chwilę.” |
| `NOT_FOUND` | „Nie znaleziono – mogło zostać usunięte.” |
| `FORBIDDEN` | „Nie masz uprawnień do tej operacji.” |
| `RESERVATION_OVERLAP` | „Ten termin koliduje z inną rezerwacją” (+ numer z `details`) |
| `CAPACITY_EXCEEDED` | „Za dużo gości dla wybranego pokoju” |
| `MIN_NIGHTS_NOT_MET` | „Minimalny pobyt w tym terminie: {minNights} noce” |
| `INVALID_STAY_DATES` | wg `details.reason` (np. „Data przyjazdu nie może być w przeszłości”) |
| `INVALID_STATUS_TRANSITION` | „Tej operacji nie można wykonać w obecnym statusie rezerwacji” |
| `VERSION_CONFLICT` | „Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane” |
| `CANCELLATION_DEADLINE_PASSED` | „Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem” |
| `SEASONAL_RATE_OVERLAP` | „Ta stawka nakłada się na stawkę „{conflictingRateName}”” |
| `HAS_FUTURE_RESERVATIONS` | „Nie można usunąć – istnieją przyszłe rezerwacje ({count})” |
| `INTERNAL_ERROR`, sieć | „Coś poszło nie tak. Spróbuj ponownie” |

Pozostałe kody z [business-rules.md](../../../docs/architecture/business-rules.md#podsumowanie) i [api-conventions.md](../../../docs/architecture/api-conventions.md#metody-i-kody-odpowiedzi) też muszą mieć wpis. Test sprawdza, że każdy znany kod ma komunikat.

**Gdzie pokazywać:**

| Sytuacja | Forma |
|-|-|
| `VALIDATION_ERROR` w formularzu | `setError` na polach z `details.fields`, plus ogólny alert dla pól bez mapowania |
| Reguła biznesowa w formularzu (409/422) | alert inline nad przyciskiem zapisu |
| Akcja z listy lub drawera | toast błędu |
| Błąd ładowania widoku | `ErrorState` z „Spróbuj ponownie” (`refetch`) |
| `VERSION_CONFLICT` | alert z przyciskiem „Odśwież dane” |
| 5xx | toast z `requestId` w szczegółach (do zgłoszenia) |

## Formularze

- React Hook Form + `zodResolver`. Schematy w `features/<f>/schemas.ts`.
- Zod waliduje **kształt** (wymagane, formaty, długości) zgodnie z ograniczeniami DTO API. Reguł biznesowych nie duplikujemy (wyjątek: proste podpowiedzi, np. maks. liczba gości z `capacity`).
- Kwoty w formularzach w złotych (`MoneyInput`), a do API wysyłamy `toMinor(value)`.

## Mocki i testy

- MSW: handlery w `src/test/msw/handlers/<feature>.ts`, odpowiedzi typowane typami z `@klucznik/api-client`.
- Endpoint jeszcze niezaimplementowany w API: handler MSW + wpis w [handoff.md](../../../docs/handoff.md) do sesji `API`.
