# ADR 0004: Uwierzytelnianie JWT z refresh tokenem w ciasteczku httpOnly

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** API, UI

## Kontekst

Wymagane są uwierzytelnianie, autoryzacja z co najmniej dwiema rolami oraz obsługa logowania po stronie frontendu. SPA działa w przeglądarce, więc tokeny trzeba chronić przed XSS i CSRF. Właściciel lub admin muszą móc unieważnić sesję, np. przy blokadzie konta.

## Decyzja

- **Access token:** JWT HS256, krótki (15 min), w nagłówku `Authorization: Bearer`, w SPA trzymany **tylko w pamięci**.
- **Refresh token:** losowy, nieprzezroczysty (32 bajty), w ciasteczku `HttpOnly; SameSite=Strict; Path=/api/v1/auth` (`Secure` w produkcji). W bazie przechowujemy tylko hash SHA-256.
- **Rotacja** przy każdym odświeżeniu. **Wykrycie ponownego użycia** unieważnionego tokenu unieważnia wszystkie sesje użytkownika.
- Unieważnienie: wylogowanie, blokada konta (`isActive = false`).
- Hasła hashowane **argon2id**.
- Role `ADMIN` i `OWNER` w JWT; autoryzacja dwupoziomowa: rola (guard, 403) i własność zasobu (polityka, 404): [ADR 0008](0008-multi-tenancy-ownership.md).

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Sesje serwerowe (cookie + store) | proste unieważnianie | stan sesji w Redisie lub DB przy każdym żądaniu; mniej typowe dla REST API |
| JWT w `localStorage` | najprostsze | podatne na XSS, brak unieważniania |
| Refresh token jako JWT | bez zapytań do DB | trudne unieważnianie bez listy blokad |
| Zewnętrzny IdP (Auth0, Keycloak) | gotowe funkcje | zewnętrzna zależność, mniej do pokazania na obronie |

## Konsekwencje

- **Pozytywne:** odporność na kradzież tokenu przez XSS (refresh niedostępny dla JS), unieważnialne sesje, bezstanowa weryfikacja zwykłych żądań.
- **Negatywne:** zablokowany użytkownik zachowuje dostęp do wygaśnięcia access tokenu (≤ 15 min). SPA musi obsłużyć cichy refresh i kolejkowanie żądań w trakcie odświeżania.
- **Wpływ:** [security.md](../architecture/security.md), [auth.md](../features/auth.md), [data-and-auth.md](../../apps/web/docs/data-and-auth.md).
