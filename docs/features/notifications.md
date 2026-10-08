# Funkcjonalność: Powiadomienia e-mail i scheduler

> Szablony e-maili, kiedy i do kogo są wysyłane, oraz zadania cykliczne (wygasanie, zamykanie pobytów, przypomnienia).
> Etapy: M9 (API). Mechanika zdarzeń, kolejki i idempotencji: [async-and-jobs.md](../architecture/async-and-jobs.md).

## 1. Cel i wartość dla użytkownika

Klucznik działa jak recepcjonista: gość dostaje potwierdzenia i przypomnienia, a właściciel informację o nowej prośbie. Nieobsłużone prośby same wygasają i zwalniają termin, a zakończone pobyty zamykają się bez udziału człowieka.

## 2. Historyjki użytkownika

- Jako **gość** chcę dostać e-mail po wysłaniu prośby, po potwierdzeniu i przed przyjazdem.
- Jako **gość** chcę dostać informację, gdy rezerwacja zostanie anulowana lub wygaśnie.
- Jako **właściciel** chcę dostać e-mail o nowej prośbie o rezerwację i o anulowaniu przez gościa.
- Jako **właściciel** nie chcę ręcznie zwalniać terminów niepotwierdzonych rezerwacji.

## 3. Reguły biznesowe

- [BR-07](../architecture/business-rules.md#br-07): wygasanie `PENDING`.
- [BR-06](../architecture/business-rules.md#br-06): przejścia systemowe `EXPIRED` i `COMPLETED`.

## 4. Model danych

[EmailLog](../architecture/data-model.md#emaillog), `Reservation.reminderSentAt`, `Reservation.expiresAt`.

## 5. Kontrakt API

Funkcjonalność nie ma własnych endpointów. Logi e-maili dla admina: `GET /admin/email-logs` ([admin-owners.md](admin-owners.md)).

## Szablony

Pliki: `apps/api/src/infrastructure/mail/templates/<nazwa>.hbs` + wspólny `layout.hbs`. Wszystkie po polsku, kwoty i daty sformatowane po polsku (helpery Handlebars `money`, `date`).

| Szablon | Odbiorca | Wyzwalacz (zdarzenie) | Temat | Treść (min.) |
|-|-|-|-|-|
| `reservation-received` | gość | `ReservationCreated` (`ONLINE`) | „Otrzymaliśmy Twoją prośbę o rezerwację {number}” | podsumowanie, status „Oczekuje”, termin odpowiedzi, link `/r/:token` |
| `owner-new-reservation` | właściciel (`User.email`) | `ReservationCreated` (`ONLINE`) | „Nowa rezerwacja do potwierdzenia: {number}” | gość, pokój, daty, kwota, `expiresAt`, link do panelu |
| `reservation-confirmed` | gość | `ReservationConfirmed`; `ReservationCreated` (`MANUAL` z e-mailem) | „Twoja rezerwacja {number} została potwierdzona” | podsumowanie, godziny zameldowania, kontakt, polityka anulowania, przycisk „Zarządzaj rezerwacją” |
| `reservation-cancelled` | gość | `ReservationCancelled` | „Rezerwacja {number} została anulowana” | kto anulował (gość / gospodarz), powód (gdy podany przez gospodarza) |
| `owner-reservation-cancelled` | właściciel | `ReservationCancelled` (`cancelledBy = GUEST`) | „Gość anulował rezerwację {number}” | daty, pokój, powód |
| `reservation-expired` | gość | `ReservationExpired` | „Prośba o rezerwację {number} wygasła” | informacja o braku potwierdzenia, link do strony obiektu |
| `stay-reminder` | gość | `StayReminderDue` | „Do zobaczenia za 2 dni w {property}” | daty, godziny, adres, kontakt, link `/r/:token` |

**White-label:** nagłówek z nazwą obiektu, nadawca `"{nazwa obiektu} przez Klucznik" <MAIL_FROM>`, `Reply-To: property.contactEmail` (jeśli ustawiony), stopka „Rezerwacje obsługuje Klucznik”. Wzór wyglądu: E1 w [screens.md](../../apps/web/docs/screens.md).
Rezerwacja ręczna bez e-maila gościa nie wysyła maila do gościa.

## Zadania cykliczne

Harmonogramy i idempotencja: [async-and-jobs.md](../architecture/async-and-jobs.md#scheduler).

| Job | Efekt widoczny dla użytkownika |
|-|-|
| `ExpirePendingReservationsJob` | `PENDING` po terminie → `EXPIRED`, termin wolny, e-mail `reservation-expired` |
| `CompleteStaysJob` | `CONFIRMED` po wyjeździe → `COMPLETED` (badge „Zakończona”) |
| `SendStayRemindersJob` | e-mail `stay-reminder` 2 dni przed przyjazdem ([Q-09](../open-questions.md#q-09)) |

## 6. Backend: zadania

- [ ] `infrastructure/mail`: port `MailerPort` + `NodemailerMailer` (SMTP z konfiguracji), `TemplateRenderer` (Handlebars, layout, helpery `money`, `date`, `pluralNights`).
- [ ] `infrastructure/queue`: rejestracja BullMQ (`emails`), `EmailProcessor` z ponowieniami.
- [ ] Moduł `notifications`: `NotificationsListener` (zdarzenie → odbiorcy, szablon, `EmailLog`, job) + mapowanie z tabeli szablonów.
- [ ] Rotacja tokenu gościa dla e-maili z linkiem ([Q-16](../open-questions.md#q-16)).
- [ ] Joby schedulera (cienkie klasy) + metody serwisów: `expirePending(now)`, `completeStays(today)`, `sendReminders(today)`.
- [ ] `AdminEmailLogsController` ([admin-owners.md](admin-owners.md)).
- [ ] Szablony `.hbs` (7) + layout; w dev podgląd w Mailpit (`http://localhost:8025`).

## 7. Frontend: ekrany i zadania

Brak ekranów w panelu właściciela. Logi e-maili są w panelu admina ([admin-owners.md](admin-owners.md)). W P4 i P5 wyświetlamy informacje zgodne z treścią e-maili.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Listener: `ReservationCreated` (`ONLINE`) → 2 `EmailLog` z poprawnymi `idempotencyKey` | unit | – |
| Ten sam event dwa razy → bez duplikatu (`idempotencyKey`) | unit | – |
| Worker: błąd SMTP → `attempts++`, `lastError`; po 5. próbie `FAILED` | unit | – |
| `TemplateRenderer`: kwota `164000` → „1 640,00 zł”, data → „14.08.2026” | unit | – |
| `expirePending` z fałszywym zegarem → `EXPIRED`, zdarzenie, termin wolny | int | BR-07 |
| `completeStays` → `COMPLETED` tylko dla `checkOut < today` | int | BR-06 |
| `sendReminders` dwukrotnie → jeden e-mail | int | – |

## 9. Kryteria akceptacji

- [ ] Scenariusz z seeda: prośba online → 2 e-maile w Mailpit; potwierdzenie → e-mail do gościa.
- [ ] Wyłączony Mailpit nie powoduje błędu HTTP rezerwacji; e-mail zostaje wysłany po przywróceniu (ponowienia).
- [ ] Rezerwacja `PENDING` po `expiresAt` zmienia się w `EXPIRED` maksymalnie po 15 minutach.

## 10. Status i otwarte kwestie

| Warstwa | Status |
|-|-|
| API | Nie rozpoczęto |
| UI | nie dotyczy (logi: M13) |

Otwarte: [Q-09](../open-questions.md#q-09), [Q-16](../open-questions.md#q-16).
