# Funkcjonalność: Panel admina (właściciele, obiekty, logi e-maili)

> Zakładanie i blokowanie kont właścicieli, przegląd wszystkich obiektów i logów e-maili przez administratora.
> Etapy: M4 (API: właściciele), M9 (API: logi e-maili), M13 (UI).

## 1. Cel i wartość dla użytkownika

Platforma działa w modelu „full service”: to administrator zakłada konta właścicieli (opcjonalnie od razu z obiektem), blokuje je i ma wgląd w całą platformę, w tym w status wysyłki e-maili.

## 2. Historyjki użytkownika

- Jako **administrator** chcę założyć konto właściciela z tymczasowym hasłem i od razu jego obiektem, aby szybko uruchomić nowego klienta.
- Jako **administrator** chcę wyszukiwać i stronicować listę właścicieli, aby szybko znaleźć klienta.
- Jako **administrator** chcę zablokować konto właściciela, aby odciąć dostęp (np. po zakończeniu umowy).
- Jako **administrator** chcę widzieć wszystkie obiekty i logi e-maili, aby diagnozować problemy klientów.

## 3. Reguły biznesowe

- [BR-12](../architecture/business-rules.md#br-12): tylko `ADMIN`; `OWNER` → 403.

## 4. Model danych

[User](../architecture/data-model.md#user), [Property](../architecture/data-model.md#property-obiekt), [EmailLog](../architecture/data-model.md#emaillog), [RefreshToken](../architecture/data-model.md#refreshtoken).

## 5. Kontrakt API

Wszystkie endpointy: rola `ADMIN`, kontroler z `@Roles('ADMIN')`.

| Metoda | Ścieżka | Request | Response | Błędy |
|-|-|-|-|-|
| `GET` | `/admin/owners` | query: `page`, `pageSize`, `q` (imię, nazwisko, e-mail), `isActive`, `sort` (`createdAt`, `lastName`; domyślnie `createdAt:desc`) | `200` `Paginated<OwnerListItemDto>` | – |
| `POST` | `/admin/owners` | `CreateOwnerDto` | `201` `OwnerDto` + `Location` | `409 EMAIL_TAKEN`, `409 SLUG_TAKEN` |
| `GET` | `/admin/owners/:id` | – | `200` `OwnerDto` | `404` |
| `PATCH` | `/admin/owners/:id` | `UpdateOwnerDto` | `200` `OwnerDto` | `409 EMAIL_TAKEN` |
| `DELETE` | `/admin/owners/:id` | – | `204` (dezaktywacja, [Q-10](../open-questions.md#q-10)) | `404` |
| `GET` | `/admin/properties` | query: `page`, `pageSize`, `q` (nazwa, miasto), `ownerId`, `isActive` | `200` `Paginated<AdminPropertyListItemDto>` | – |
| `GET` | `/admin/email-logs` | query: `page`, `pageSize`, `status`, `q` (odbiorca), `from`, `to` (data `createdAt`) | `200` `Paginated<EmailLogDto>` | – ([Q-07](../open-questions.md#q-07)) |

- `CreateOwnerDto`: `firstName`, `lastName` (1–100), `email`, `password` (min. 10), `property?`: `{ name (1–120), slug? }` ([Q-07](../open-questions.md#q-07)). Gdy podano `property`, obiekt powstaje w tej samej transakcji z wartościami domyślnymi ([properties.md](properties.md)).
- `UpdateOwnerDto`: wszystkie pola opcjonalne: `firstName`, `lastName`, `email`, `password`, `isActive`. Ustawienie `isActive: false` unieważnia wszystkie refresh tokeny.
- `OwnerListItemDto`: `id`, `firstName`, `lastName`, `email`, `isActive`, `propertiesCount`, `reservationsLast30Days` (utworzone w ostatnich 30 dniach), `createdAt`.
- `OwnerDto`: jak wyżej + `properties: { id, name, slug, isActive }[]`.
- `AdminPropertyListItemDto`: `id`, `name`, `slug`, `city`, `isActive`, `owner: { id, firstName, lastName, email }`, `roomsCount`, `createdAt`.
- `EmailLogDto`: `id`, `recipient`, `template`, `status`, `attempts`, `lastError`, `sentAt`, `createdAt`, `reservationNumber?`.
- Tymczasowe hasło nie jest wysyłane e-mailem. Admin przekazuje je właścicielowi osobnym kanałem.

## 6. Backend: zadania

- [ ] Moduł `admin` (lub `users` z kontrolerem admina): `AdminOwnersController`, `OwnersService`, `UsersRepository`.
- [ ] Unikalność e-maila (sprawdzenie + mapowanie `P2002` → `EMAIL_TAKEN`).
- [ ] Tworzenie właściciela z obiektem w jednej transakcji (reużycie `PropertiesService.create`).
- [ ] Dezaktywacja: `isActive = false` + `revokeAllForUser`.
- [ ] Liczniki `propertiesCount` i `reservationsLast30Days` jednym zapytaniem (bez N+1).
- [ ] `AdminPropertiesController` (lista wszystkich obiektów).
- [ ] `AdminEmailLogsController` (M9, po module notifications).

## 7. Frontend: ekrany i zadania

Ekrany: A1 i pochodne: [screens.md](../../apps/web/docs/screens.md).

- [ ] `AdminLayout` z sidebar: „Właściciele”, „Obiekty”, „Logi e-maili” i etykietą „Administrator”.
- [ ] `/admin/wlasciciele`: tabela, wyszukiwarka (debounce), paginacja, status „Aktywny/Zablokowany”.
- [ ] Dialog „Nowy właściciel”: pola, przycisk „Generuj” hasło, opcja „Utwórz od razu obiekt”. Obsługa `EMAIL_TAKEN` przy polu e-mail.
- [ ] Akcje wiersza: edycja (dialog), blokada/odblokowanie z potwierdzeniem.
- [ ] `/admin/obiekty`: tabela z filtrem właściciela, link do podglądu `/o/:slug`.
- [ ] `/admin/logi-email`: tabela z filtrem statusu; `FAILED` wyróżnione, `lastError` w tooltipie.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| `OWNER` → każdy endpoint `/admin/**` → 403 | int | BR-12 |
| Utworzenie właściciela z obiektem → 201, można się zalogować | int | – |
| Duplikat e-maila → 409 `EMAIL_TAKEN` | int | – |
| Dezaktywacja → refresh właściciela → 401 | int | – |
| Paginacja i wyszukiwanie `q` | int | – |
| Dialog: walidacja, mapowanie `EMAIL_TAKEN` na pole | ui | – |

## 9. Kryteria akceptacji

- [ ] Admin zakłada właściciela z obiektem, a właściciel loguje się i widzi ten obiekt w panelu.
- [ ] Zablokowany właściciel nie może się zalogować ani odświeżyć sesji.
- [ ] Lista właścicieli ma wyszukiwanie i paginację zgodną z [api-conventions.md](../architecture/api-conventions.md#paginacja).

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | Nie rozpoczęto |

Otwarte: [Q-07](../open-questions.md#q-07) (logi e-maili, obiekt przy zakładaniu), [Q-10](../open-questions.md#q-10) (semantyka `DELETE`).
