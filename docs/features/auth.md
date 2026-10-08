# Funkcjonalność: Uwierzytelnianie i role

> Logowanie, odświeżanie sesji, wylogowanie i bieżący użytkownik dla ról `OWNER` i `ADMIN`.
> Etapy: M4 (API), M10 (UI). Mechanika tokenów: [security.md](../architecture/security.md), [ADR 0004](../decisions/0004-auth-jwt-refresh-cookie.md).

## 1. Cel i wartość dla użytkownika

Właściciel i administrator logują się do panelu bezpiecznie i bez częstego ponownego logowania. Sesja przetrwa przeładowanie strony, a zablokowane konto traci dostęp.

## 2. Historyjki użytkownika

- Jako **właściciel** chcę zalogować się e-mailem i hasłem, aby zarządzać swoim obiektem.
- Jako **właściciel** chcę pozostać zalogowany po odświeżeniu strony, aby nie wpisywać hasła co chwilę.
- Jako **zalogowany użytkownik** chcę się wylogować, aby nikt nie użył mojej sesji na wspólnym komputerze.
- Jako **administrator** chcę po zalogowaniu trafić do panelu admina.

## 3. Reguły biznesowe

- [BR-12](../architecture/business-rules.md#br-12): role (403) jako podstawa autoryzacji całego API.

## 4. Model danych

[User](../architecture/data-model.md#user), [RefreshToken](../architecture/data-model.md#refreshtoken).

## 5. Kontrakt API

| Metoda | Ścieżka | Rola | Request | Response | Błędy |
|-|-|-|-|-|-|
| `POST` | `/auth/login` | publiczny | `{ email, password }` | `200` `AuthResponseDto` + `Set-Cookie: kl_refresh` | `401 INVALID_CREDENTIALS`, `429` |
| `POST` | `/auth/refresh` | publiczny (cookie) | – | `200` `AuthResponseDto` + nowe cookie | `401 UNAUTHORIZED` |
| `POST` | `/auth/logout` | publiczny (cookie) | – | `204` + wyczyszczone cookie | – (idempotentny) |
| `GET` | `/auth/me` | `OWNER`, `ADMIN` | – | `200` `MeDto` | `401` |

- `LoginDto`: `email` (e-mail, max 254, normalizowany do małych liter), `password` (string 1–200).
- `AuthResponseDto`: `{ accessToken: string, expiresIn: number /* s */, user: MeDto }`.
- `MeDto`: `{ id, email, firstName, lastName, role: 'ADMIN' | 'OWNER' }`.
- `/auth/logout` działa bez access tokenu: unieważnia refresh token z ciasteczka (jeśli istnieje) i czyści cookie.

## 6. Backend: zadania

- [x] Moduł `auth`: `AuthController`, `AuthService`, `TokenService` (JWT + refresh, czas z `Clock`), `SessionsService` (eksport: unieważnianie sesji). `PasswordHasher` jako wspólny port `PASSWORD_HASHER` (`common/security`, adapter argon2 w `infrastructure/security`), bo używa go też moduł `users`.
- [x] `RefreshTokenRepository`: create, findByHash, revoke, revokeAllForUser.
- [x] Rotacja refresh tokenu + wykrycie ponownego użycia ([security.md](../architecture/security.md#refresh-token)).
- [x] Globalne guardy: `JwtAuthGuard` (z `@Public()`), `RolesGuard` (z `@Roles()`, fail-closed: trasa bez `@Roles()` i bez `@Public()` → 403); dekorator `@CurrentUser()`.
- [x] Ciasteczko: helper `setRefreshCookie` / `clearRefreshCookie` z konfiguracji (`COOKIE_SECURE`).
- [x] Throttling dla `/auth/login` i `/auth/refresh`.
- [x] Seed: konto admina z `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD` ([persistence-layer.md](../../apps/api/docs/persistence-layer.md#seed)).
- [x] Swagger: `@ApiBearerAuth`, opis ciasteczka w `/auth/*`.

## 7. Frontend: ekrany i zadania

Ekrany: O1 (logowanie): [screens.md](../../apps/web/docs/screens.md).

- [ ] Strona `/logowanie`: formularz (RHF + zod), pokaż/ukryj hasło, alert „Nieprawidłowy e-mail lub hasło” dla `INVALID_CREDENTIALS`, komunikat dla `RATE_LIMITED`.
- [ ] Link „Nie pamiętasz hasła?” ukryty w MVP ([Q-06](../open-questions.md#q-06)).
- [ ] `AuthProvider`: access token w pamięci, `bootstrap()` → `/auth/refresh` przy starcie aplikacji, stan `loading | authenticated | anonymous`.
- [ ] Interceptor: 401 → jeden współdzielony refresh → ponowienie żądania; nieudany refresh → wylogowanie i przekierowanie do `/logowanie?next=…` ([data-and-auth.md](../../apps/web/docs/data-and-auth.md)).
- [ ] Przekierowanie po logowaniu: `OWNER` → `/panel`, `ADMIN` → `/admin`.
- [ ] Menu użytkownika z „Wyloguj”.
- [ ] `RequireRole` dla tras `/panel/*` i `/admin/*`.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Poprawny login → 200, `accessToken`, cookie `HttpOnly` | int | – |
| Złe hasło / nieznany e-mail / konto nieaktywne → 401 `INVALID_CREDENTIALS` | int | – |
| Refresh rotuje token; stary token ponownie → 401 i unieważnienie wszystkich | int | – |
| `GET /auth/me` bez tokenu → 401 | int | – |
| `OWNER` na `/admin/owners` → 403 | int | BR-12 |
| `TokenService`: wygasły i podrobiony JWT odrzucony | unit | – |
| Formularz logowania: walidacja, błąd 401, przekierowanie wg roli | ui | – |
| Interceptor: równoległe 401 → jeden refresh | ui | – |

## 9. Kryteria akceptacji

- [ ] Po zalogowaniu i przeładowaniu strony użytkownik nadal jest zalogowany.
- [ ] Refresh token nie jest dostępny z JavaScriptu (`document.cookie`).
- [ ] Zablokowanie konta przez admina uniemożliwia odświeżenie sesji.
- [ ] `OWNER` nie wejdzie na `/admin` (UI przekierowuje, API zwraca 403).

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Gotowe (M4) |
| UI | Nie rozpoczęto |

Otwarte: [Q-06](../open-questions.md#q-06) (reset hasła).
