# Warstwa aplikacji (`modules/*/application`)

> Serwisy przypadków użycia, polityki dostępu, transakcje, porty i emisja zdarzeń. Czytaj przy implementacji logiki każdej funkcjonalności.
> Reguły zależności: [apps/api/AGENTS.md](../AGENTS.md#reguły-zależności-pilnuj-ich-w-każdym-pr).

## Odpowiedzialność

Serwis aplikacyjny **orkiestruje** przypadek użycia:

1. sprawdza dostęp (polityka własności, BR-12),
2. otwiera transakcję, jeśli jest potrzebna,
3. pobiera dane przez porty (repozytoria),
4. wywołuje logikę domenową (reguły, obliczenia, przejścia stanów),
5. zapisuje zmiany przez porty,
6. po commicie emituje zdarzenia domenowe,
7. zwraca model (nie DTO) do kontrolera.

Serwis nie zna HTTP (`Request`, kodów statusu) ani Prismy.

## Porty (interfejsy) i DI

```ts
// modules/rooms/application/ports/rooms.repository.port.ts
export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');
export interface RoomsRepositoryPort {
  findById(id: string, scope: AccessScope): Promise<Room | null>;
  create(data: NewRoom): Promise<Room>;
  // …
}

// rooms.module.ts
providers: [RoomsService, { provide: ROOMS_REPOSITORY, useClass: PrismaRoomsRepository }]
```

- Port leży w `application/ports/`, implementacja w `infrastructure/`.
- Porty techniczne wspólne dla wielu modułów (`MailerPort`, `StoragePort`, `Clock`, `TransactionManager`) są w `common/` lub `infrastructure/` z tokenem DI: [integrations.md](integrations.md).
- W testach jednostkowych serwisów wstrzykujemy fake'i w pamięci (`InMemoryRoomsRepository`).

## Polityki dostępu

Model: [ADR 0008](../../../docs/decisions/0008-multi-tenancy-ownership.md). Typy i port w `common/access/` (`AccessScope`, `scopeOf(user)`, `ownerIdFilter(scope)`, `OWNERSHIP_POLICY`), implementacja `PrismaOwnershipPolicy` w `infrastructure/access/` (globalny `AccessModule`):

```ts
export type AccessScope = { userId: string; role: 'ADMIN' | 'OWNER' };

// Repozytorium: OWNER → warunek po właścicielu; ADMIN → brak warunku
where: scope.role === 'ADMIN' ? { id } : { id, property: { ownerId: scope.userId } }
```

| Zasada | Szczegóły |
|-|-|
| Filtr w zapytaniu, nie po pobraniu | repozytorium dostaje `AccessScope` i buduje `where`; nie pobieramy rekordu, żeby potem porównać `ownerId` w kodzie |
| Brak wyniku → `NotFoundError` | to samo dla nieistniejącego i cudzego zasobu (BR-12) |
| Zasób zagnieżdżony | dostęp do pokoju sprawdza właściciela obiektu; do stawki lub blokady właściciela przez pokój |
| Tworzenie w kontekście rodzica | najpierw `findById(parentId, scope)`, potem zapis |
| Listy | zawsze filtrowane po scope; `ADMIN` może podać `ownerId` lub `propertyId` |

`OwnershipPolicy` to współdzielony port (`@Inject(OWNERSHIP_POLICY)`) z metodami `assertProperty(propertyId, scope)`, `assertRoom(roomId, scope) → { room, property }`, używany tam, gdzie zasób nie jest pobierany repozytorium z filtrem. Usunięty obiekt lub pokój (soft delete) też daje 404.

Test izolacji: `test/integration/isolation.e2e-spec.ts` (każdy endpoint panelu, owner B → zasób A → 404). Operacje niszczące są na końcu listy, bo udany wyciek usunąłby zasób i zamaskował kolejne przypadki (sprawdzone mutacją filtra).

## Transakcje

- Port `TransactionManager.run(fn)` (`common/transactions/transaction-manager.ts`, token `TRANSACTION_MANAGER`). Implementacja `ClsTransactionManager`: `@nestjs-cls/transactional` z adapterem Prisma (`prisma.$transaction` + kontekst w `AsyncLocalStorage`). Repozytoria automatycznie używają bieżącej transakcji przez `txHost.tx` ([persistence-layer.md](persistence-layer.md#repozytoria)).
- Poziom izolacji domyślny (`READ COMMITTED`). Spójność rezerwacji zapewnia `SELECT … FOR UPDATE` na wierszu pokoju + `EXCLUDE` constraint ([business-rules.md](../../../docs/architecture/business-rules.md#br-01)).
- Transakcja obejmuje: blokadę, sprawdzenia, zapis, `ReservationEvent`, numer z licznika. **Nie** obejmuje wysyłki e-maili ani operacji na plikach.
- Operacje na plikach: zapis pliku przed transakcją z kompensacją przy błędzie; usunięcie pliku po commicie.

## Zdarzenia domenowe

```ts
const { reservation, events } = await this.tx.run(async () => { … return { reservation, events: [new ReservationCreated(…)] }; });
events.forEach((e) => this.eventBus.publish(e)); // po commicie
```

- `EventBus` to port opakowujący `EventEmitter2` (`emitAsync` nie blokuje odpowiedzi; błędy listenerów są logowane).
- Klasy zdarzeń leżą w `modules/<f>/domain/events/`; nazwy i odbiorcy: [async-and-jobs.md](../../../docs/architecture/async-and-jobs.md#zdarzenia-domenowe).

## Konwencje serwisów

- Jeden serwis na agregat lub obszar (`ReservationsService`, `GuestBookingService`), a metody odpowiadają przypadkom użycia (`createManual`, `confirm`, `cancel`, `update`).
- Wejście to obiekt komendy (`CreateManualReservationCommand`), nie DTO HTTP. Mapowanie DTO → komenda robi kontroler lub mapper.
- Aktor przekazywany jawnie (`AuthUser` lub `{ type: 'GUEST' }` lub `SYSTEM`), bo jest potrzebny do maszyny stanów i historii.
- Czas zawsze z `Clock`.
- Serwisy innych modułów wywołujemy przez ich publiczne API (eksport z modułu), np. `AvailabilityService`, `PricingFacade`, `GuestsService`.

## Testy

| Co | Jak |
|-|-|
| Orkiestracja (kolejność, polityka, zdarzenia) | Jest + fake repozytoria + `FixedClock` + fake `EventBus` |
| Wyścigi, transakcje, constrainty | tylko integracyjnie (prawdziwy PostgreSQL) |

Przykład nazwy: `it('BR-12: throws NotFoundError for room of another owner')`.
