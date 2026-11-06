import type { AccessScope } from '../../../common/access/access-scope';
import type { OwnershipPolicy } from '../../../common/access/ownership.policy';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { FixedClock } from '../../../common/domain/clock';
import type { EventBus } from '../../../common/events/event-bus';
import type { TransactionManager } from '../../../common/transactions/transaction-manager';
import type { AvailabilityService } from '../../availability/application/availability.service';
import type { GuestsService } from '../../guests/application/guests.service';
import { VersionConflictError } from '../domain/errors';
import type {
  NewReservationEvent,
  ReservationChanges,
  ReservationDetail,
  ReservationsRepository,
  ReservationState,
} from './reservation-ports';
import { ReservationsService } from './reservations.service';

const ID = '0b5f8c1e-6a4d-4c1f-9d2e-3a7b5c9e1f20';
const OWNER: AccessScope = { userId: '6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a', role: 'OWNER' };

/** Fake repozytorium w pamięci: tylko metody używane przez `update` (BR-11). */
class InMemoryReservations {
  state: ReservationState = {
    id: ID,
    propertyId: 'property-1',
    roomId: 'room-1',
    checkIn: CalendarDate.parse('2026-08-14'),
    checkOut: CalendarDate.parse('2026-08-18'),
    guestsCount: 2,
    status: 'CONFIRMED',
    source: 'MANUAL',
    guestNotes: null,
    internalNotes: null,
    expiresAt: null,
    version: 3,
  };
  readonly writes: ReservationChanges[] = [];
  readonly events: NewReservationEvent[] = [];
  /** Zapis innego użytkownika między odczytem a zapisem (symulacja wyścigu). */
  beforeWrite: () => void = () => undefined;

  findState(): Promise<ReservationState | null> {
    return Promise.resolve({ ...this.state });
  }

  findDetail(): Promise<ReservationDetail | null> {
    return Promise.resolve({ id: ID, version: this.state.version } as ReservationDetail);
  }

  // BR-11: `UPDATE … WHERE id AND version` z `version + 1`, jak repozytorium Prismy.
  updateIf(_id: string, expected: { version?: number }, changes: ReservationChanges) {
    this.beforeWrite();
    if (expected.version !== undefined && expected.version !== this.state.version) {
      return Promise.resolve(false);
    }
    this.writes.push(changes);
    this.state = { ...this.state, ...changes, version: this.state.version + 1 };
    return Promise.resolve(true);
  }

  addEvent(event: NewReservationEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

function setup(): { service: ReservationsService; repo: InMemoryReservations } {
  const repo = new InMemoryReservations();
  const tx: TransactionManager = { run: (fn) => fn() };
  const events: EventBus = { publish: () => Promise.resolve() };
  const service = new ReservationsService(
    repo as unknown as ReservationsRepository,
    {} as OwnershipPolicy,
    tx,
    FixedClock.at('2026-08-01T10:00:00+02:00'),
    // Zmiana samych notatek nie sprawdza dostępności ani gości.
    {} as AvailabilityService,
    {} as GuestsService,
    events,
  );
  return { service, repo };
}

describe('ReservationsService.update', () => {
  it('BR-11: saves changes, bumps the version and records UPDATED', async () => {
    const { service, repo } = setup();

    const result = await service.update(ID, OWNER, { version: 3, internalNotes: 'Late arrival' });

    expect(result.version).toBe(4);
    expect(repo.writes).toEqual([{ internalNotes: 'Late arrival' }]);
    expect(repo.events).toEqual([
      expect.objectContaining({ type: 'UPDATED', payload: { fields: ['internalNotes'] } }),
    ]);
  });

  it('BR-11: rejects a stale version with VERSION_CONFLICT without writing', async () => {
    const { service, repo } = setup();

    await expect(
      service.update(ID, OWNER, { version: 2, internalNotes: 'Late arrival' }),
    ).rejects.toBeInstanceOf(VersionConflictError);
    expect(repo.writes).toEqual([]);
    expect(repo.events).toEqual([]);
  });

  it('BR-11: rejects a write that lost the race after the version check', async () => {
    const { service, repo } = setup();
    repo.beforeWrite = () => {
      repo.state = { ...repo.state, version: repo.state.version + 1 };
    };

    await expect(
      service.update(ID, OWNER, { version: 3, internalNotes: 'Late arrival' }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(repo.writes).toEqual([]);
    expect(repo.events).toEqual([]);
  });

  it('BR-11: an update without real changes keeps the version and history', async () => {
    const { service, repo } = setup();

    const result = await service.update(ID, OWNER, { version: 3, guestsCount: 2 });

    expect(result.version).toBe(3);
    expect(repo.writes).toEqual([]);
    expect(repo.events).toEqual([]);
  });
});
