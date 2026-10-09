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

Pliki: `apps/api/src/infrastructure/mail/templates/<nazwa>.hbs` + wspólny `layout.hbs` (tematy w `EMAIL_SUBJECTS` w `handlebars-template-renderer.ts`). Wszystkie po polsku, kwoty i daty sformatowane po polsku (helpery Handlebars `money`, `date`, `dateTime`, `pluralNights`). Szablony kompiluje się w trybie `strict`: brakujące pole kontekstu to błąd (próba `FAILED` w `EmailLog`), a nie e-mail z pustym miejscem. Wersja tekstowa powstaje z HTML. Prettier pomija `*.hbs` (parser glimmer usuwa `<!doctype html>`).

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

- [x] `infrastructure/mail`: port `MAILER` (`common/mail/mailer.ts`) + `NodemailerMailer` (SMTP z `mailConfig`), `TEMPLATE_RENDERER` (Handlebars, layout, helpery `money`, `date`, `dateTime`, `pluralNights`); globalny `MailModule`.
- [x] Kolejka `emails` w `modules/notifications/infrastructure/queue/` (zależy od `EmailLog`, więc jest przy powiadomieniach): `BullEmailQueueModule` (BullMQ, `EmailProcessor`, wskaźnik `redis`) albo `InlineEmailQueueModule` według `EMAIL_QUEUE_DRIVER`. `jobId` = id `EmailLog`, bo BullMQ nie przyjmuje `:` w id; duplikaty wyklucza unikalny `idempotencyKey` zapisany przed dodaniem joba.
- [x] Moduł `notifications`: `NotificationsListener` (zdarzenie → odbiorcy, szablon, `EmailLog`, job) + mapowanie z tabeli szablonów jako czysta funkcja `domain/email-plan.ts` (`planEmails`). `EmailLog` przez `INSERT … ON CONFLICT DO NOTHING`; token i job tylko dla nowego wpisu. Błąd kolejki (np. Redis) → `EmailLog` `FAILED`, bez błędu HTTP.
- [x] Rotacja tokenu gościa dla e-maili z linkiem ([Q-16](../open-questions.md#q-16)): `GuestTokenService.issue` (moduł `reservations`) przy planowaniu e-maila. Surowy token jest tylko w danych joba, nie w `EmailLog` ani zdarzeniu.
- [x] Joby schedulera (`ReservationJobsScheduler`, `@Cron` w `Europe/Warsaw`, tylko przy `SCHEDULER_ENABLED`) + metody `ReservationJobsService`: `expirePending(now)`, `completeStays(today, now)`, `sendReminders(today, now)`.
- [x] `AdminEmailLogsController` ([admin-owners.md](admin-owners.md)).
- [x] Szablony `.hbs` (7) + layout; w dev podgląd w Mailpit (`http://localhost:8025`).

## 7. Frontend: ekrany i zadania

Brak ekranów w panelu właściciela. Logi e-maili są w panelu admina ([admin-owners.md](admin-owners.md)). W P4 i P5 wyświetlamy informacje zgodne z treścią e-maili.

## 8. Testy

| Przypadek | Poziom | Reguła |
|-|-|-|
| Listener: `ReservationCreated` (`ONLINE`) → 2 `EmailLog` z poprawnymi `idempotencyKey` | unit | – |
| Ten sam event dwa razy → bez duplikatu (`idempotencyKey`) | unit | – |
| Worker: błąd SMTP → `attempts++`, `lastError`; po 5. próbie `FAILED` | unit | – |
| `TemplateRenderer`: kwota `164000` → „1 640,00 zł”, data → „14.08.2026”; 7 szablonów w trybie `strict` | unit | – |
| Prośba online → 2 e-maile, link z e-maila działa; potwierdzenie → nowy link, stary 404 | int | Q-16 |
| SMTP niedostępny → rezerwacja 201, `EmailLog` `FAILED` z `lastError` | int | – |
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
| API | Gotowe (M9) |
| UI | nie dotyczy (logi: M13) |

Zdecydowane: [Q-09](../open-questions.md#q-09), [Q-16](../open-questions.md#q-16).
