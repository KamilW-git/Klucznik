# ADR 0005: Zdarzenia domenowe + kolejka BullMQ dla e-maili

- **Status:** Zaakceptowany
- **Data:** 2026-10-08
- **Dotyczy:** API, INFRA

## Kontekst

Na 5.0 wymagany jest mechanizm asynchroniczny i element rozszerzony z rzeczywistym zastosowaniem. Rezerwacje generują e-maile do gości i właścicieli. Wysyłka SMTP jest wolna i zawodna, więc nie może blokować odpowiedzi HTTP ani wycofywać transakcji. Potrzebne są też zadania cykliczne: wygasanie, zamykanie pobytów i przypomnienia.

## Decyzja

- **`@nestjs/event-emitter`**: serwisy emitują zdarzenia domenowe (`ReservationCreated`, `ReservationConfirmed`, …) **po commicie** transakcji.
- **BullMQ + Redis**: listener zdarzeń tworzy `EmailLog` i dodaje job do kolejki `emails`. Worker wysyła e-mail z ponowieniami (5 prób, backoff wykładniczy).
- **nodemailer + Handlebars**: szablony po polsku; w dev Mailpit przechwytuje pocztę.
- **`@nestjs/schedule`**: joby cron w strefie `Europe/Warsaw`, z logiką w serwisach aplikacyjnych.
- Idempotencja: zapisy warunkowe, `EmailLog.idempotencyKey` + `jobId`.
- MVP: worker i scheduler w procesie `api`; architektura pozwala wydzielić osobny proces `worker`.

## Rozważane alternatywy

| Opcja | Zalety | Wady |
|-|-|-|
| Tylko EventEmitter (wysyłka w listenerze) | najprościej | brak ponowień i trwałości; restart gubi e-maile |
| RabbitMQ / Kafka | dojrzałe brokery | cięższa infrastruktura, nadmiarowa przy jednym typie zadań |
| Transactional outbox w PostgreSQL | gwarancja „dokładnie raz po commicie” | więcej kodu; możliwe rozszerzenie później |
| Synchroniczna wysyłka | prostota | blokuje żądania, błąd SMTP psuje UX |

## Konsekwencje

- **Pozytywne:** odporność na awarie SMTP, widoczność stanu wysyłki (`EmailLog`), luźne powiązanie modułów rezerwacji i powiadomień; spełnia „mechanizm asynchroniczny”, „wysyłanie e-maili” i „scheduler”.
- **Negatywne:** dodatkowy kontener Redis. Między commitem a dodaniem joba istnieje małe okno, w którym awaria procesu zgubi e-mail (akceptowane w MVP; outbox jako rozszerzenie).
- **Wpływ:** [async-and-jobs.md](../architecture/async-and-jobs.md), [notifications.md](../features/notifications.md), [integrations.md](../../apps/api/docs/integrations.md).
