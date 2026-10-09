import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { MANUAL_PAST_CHECK_IN_DAYS, StayRange } from '../../../common/domain/stay-range';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import type { SortSpec } from '../../../common/http/sort';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import type { AvailabilityResult } from '../../availability/application/availability.service';
import { AvailabilityService } from '../../availability/application/availability.service';
import type { BookableRoom } from '../../availability/application/ports';
import { GuestsService } from '../../guests/application/guests.service';
import type { GuestInput } from '../../guests/application/ports';
import { assertEditable, type EditableField } from '../domain/editing-policy';
import { InvalidStatusTransitionError, VersionConflictError } from '../domain/errors';
import { formatReservationNumber } from '../domain/reservation-number';
import { assertCapacity } from '../domain/reservation-policy';
import {
  assertConfirmable,
  assertTransition,
  type ReservationSource,
  type ReservationStatus,
} from '../domain/reservation-status';
import type { ReservationListItem } from './read-models';
import {
  type NightPriceRecord,
  type ReservationChanges,
  type ReservationDetail,
  RESERVATIONS_REPOSITORY,
  type ReservationSortField,
  type ReservationsRepository,
  type ReservationState,
} from './reservation-ports';

export interface ManualReservationInput {
  roomId: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  guestsCount: number;
  guest: GuestInput;
  guestNotes: string | null;
  internalNotes: string | null;
  /** Q-01: właściciel może pominąć BR-03. */
  ignoreMinNights: boolean;
}

export interface ReservationUpdateInput {
  /** BR-11 */
  version: number;
  internalNotes?: string | null;
  guestNotes?: string | null;
  guestsCount?: number;
  roomId?: string;
  checkIn?: CalendarDate;
  checkOut?: CalendarDate;
  /** Q-01: tylko dla rezerwacji `MANUAL`. */
  ignoreMinNights?: boolean;
}

export interface ListReservationsInput extends PaginationQuery {
  propertyId?: string;
  roomId?: string;
  statuses?: ReservationStatus[];
  source?: ReservationSource;
  from?: CalendarDate;
  to?: CalendarDate;
  q?: string;
  sort: SortSpec<ReservationSortField>[];
}

/**
 * Rezerwacje w panelu (docs/features/reservations.md): rezerwacja ręczna, edycja, potwierdzanie
 * i anulowanie. Aktorem jest zalogowany `OWNER` lub `ADMIN` (`AccessScope`); dostęp: BR-12.
 * Zdarzenia domenowe po commicie (`ReservationCreated`, …) dochodzą w M9 razem z `EventBus`.
 */
@Injectable()
export class ReservationsService {
  constructor(
    @Inject(RESERVATIONS_REPOSITORY) private readonly reservations: ReservationsRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly availability: AvailabilityService,
    private readonly guests: GuestsService,
  ) {}

  async list(
    scope: AccessScope,
    query: ListReservationsInput,
  ): Promise<Paginated<ReservationListItem>> {
    const { items, total } = await this.reservations.list({
      ...query,
      scope,
      ...toSkipTake(query),
    });
    return paginate(items, query, total);
  }

  async get(id: string, scope: AccessScope): Promise<ReservationDetail> {
    const detail = await this.reservations.findDetail(id, scope);
    if (!detail) {
      throw new NotFoundError('Reservation', id);
    }
    return detail;
  }

  /** Rezerwacja ręczna (telefoniczna): od razu `CONFIRMED`, cena z serwera (BR-05). */
  async createManual(
    propertyId: string,
    scope: AccessScope,
    input: ManualReservationInput,
  ): Promise<ReservationDetail> {
    const property = await this.ownership.assertProperty(propertyId, scope); // BR-12
    const id = await this.tx.run(async () => {
      const room = await this.roomOfProperty(input.roomId, property.id);
      // BR-01: zamek pokoju, potem sprawdzenie kolizji i zapis w tej samej transakcji.
      await this.availability.lockRoom(room.id);
      const stay = StayRange.of(input.checkIn, input.checkOut); // BR-04
      const { price, currency } = await this.availability.assertAvailable(
        room,
        stay,
        input.guestsCount,
        // Q-01: przyjazd do 30 dni wstecz, BR-03 do pominięcia.
        { allowPastCheckInDays: MANUAL_PAST_CHECK_IN_DAYS, ignoreMinNights: input.ignoreMinNights },
      );
      const guestId = await this.guests.resolveForReservation(property.id, input.guest);
      const year = Number(this.clock.today().toString().slice(0, 4));
      const reservationId = await this.reservations.create({
        number: formatReservationNumber(year, await this.reservations.nextSequence(year)), // Q-12
        propertyId: property.id,
        roomId: room.id,
        guestId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guestsCount: input.guestsCount,
        status: 'CONFIRMED',
        source: 'MANUAL',
        totalPrice: price.total,
        currency,
        priceBreakdown: toPriceRecords(price.breakdown),
        guestNotes: input.guestNotes,
        internalNotes: input.internalNotes,
        confirmedAt: this.clock.now(),
        expiresAt: null,
        // M9: token gościa z e-mailem powstaje przy wysyłce e-maila (Q-16).
        guestAccessTokenHash: null,
      });
      await this.reservations.addEvent({
        reservationId,
        type: 'CREATED',
        actorType: scope.role,
        actorUserId: scope.userId,
        payload: { source: 'MANUAL', status: 'CONFIRMED' },
      });
      return reservationId;
    });
    // M9: ReservationCreated po commicie (e-mail do gościa z adresem).
    return this.get(id, scope);
  }

  // BR-06, BR-07
  async confirm(id: string, scope: AccessScope): Promise<ReservationDetail> {
    await this.tx.run(async () => {
      const current = await this.findStateOrFail(id, scope);
      const now = this.clock.now();
      assertConfirmable(current, scope.role, now);
      await this.transition(current, 'CONFIRMED', { confirmedAt: now, expiresAt: null });
      await this.reservations.addEvent({
        reservationId: id,
        type: 'CONFIRMED',
        actorType: scope.role,
        actorUserId: scope.userId,
      });
    });
    // M9: ReservationConfirmed po commicie.
    return this.get(id, scope);
  }

  // BR-06: właściciel i admin anulują PENDING (odrzucenie) i CONFIRMED bez terminu BR-08.
  async cancel(id: string, scope: AccessScope, reason: string | null): Promise<ReservationDetail> {
    await this.tx.run(async () => {
      const current = await this.findStateOrFail(id, scope);
      assertTransition(current.status, 'CANCELLED', scope.role);
      await this.transition(current, 'CANCELLED', {
        cancelledAt: this.clock.now(),
        cancelledBy: scope.role,
        cancellationReason: reason,
      });
      await this.reservations.addEvent({
        reservationId: id,
        type: 'CANCELLED',
        actorType: scope.role,
        actorUserId: scope.userId,
        payload: reason ? { reason } : undefined,
      });
    });
    // M9: ReservationCancelled po commicie.
    return this.get(id, scope);
  }

  /**
   * BR-11 i Q-02: edycja z optimistic locking. Zmiana dat lub pokoju ponownie sprawdza BR-01…05
   * i BR-13 (bez kolizji z samą sobą) i przelicza cenę wg aktualnego cennika; sama liczba gości: BR-02.
   */
  async update(
    id: string,
    scope: AccessScope,
    input: ReservationUpdateInput,
  ): Promise<ReservationDetail> {
    await this.tx.run(async () => {
      const current = await this.findStateOrFail(id, scope);
      if (current.version !== input.version) {
        throw new VersionConflictError(); // BR-11
      }
      const changes = changedFields(current, input);
      const fields = Object.keys(changes) as EditableField[];
      if (fields.length === 0) {
        return;
      }
      assertEditable(current, fields, this.clock.today()); // Q-02

      const repriced = await this.revalidate(current, changes, input.ignoreMinNights === true);
      const saved = await this.reservations.updateIf(
        id,
        { version: input.version },
        { ...changes, ...repriced },
      );
      if (!saved) {
        throw new VersionConflictError(); // BR-11: ktoś zapisał między odczytem a zapisem
      }
      await this.reservations.addEvent({
        reservationId: id,
        type: 'UPDATED',
        actorType: scope.role,
        actorUserId: scope.userId,
        payload: { fields },
      });
    });
    return this.get(id, scope);
  }

  private async revalidate(
    current: ReservationState,
    changes: ReservationChanges,
    ignoreMinNights: boolean,
  ): Promise<Pick<ReservationChanges, 'totalPrice' | 'priceBreakdown'>> {
    const stayChanged =
      changes.roomId !== undefined ||
      changes.checkIn !== undefined ||
      changes.checkOut !== undefined;
    if (!stayChanged && changes.guestsCount === undefined) {
      return {};
    }

    const roomId = changes.roomId ?? current.roomId;
    const room = await this.roomOfProperty(roomId, current.propertyId);
    // Stała kolejność zamków (stary i nowy pokój) wyklucza zakleszczenie dwóch przeniesień.
    for (const lockId of [...new Set([current.roomId, roomId])].sort()) {
      await this.availability.lockRoom(lockId);
    }
    const guestsCount = changes.guestsCount ?? current.guestsCount;
    if (!stayChanged) {
      assertCapacity(room, guestsCount); // BR-02
      return {};
    }

    const stay = StayRange.of(
      changes.checkIn ?? current.checkIn,
      changes.checkOut ?? current.checkOut,
    ); // BR-04
    const result: AvailabilityResult = await this.availability.assertAvailable(
      room,
      stay,
      guestsCount,
      {
        excludeReservationId: current.id,
        ignoreMinNights: current.source === 'MANUAL' && ignoreMinNights, // Q-01
      },
    );
    // BR-05: nowa cena według aktualnego cennika (Q-02).
    return {
      totalPrice: result.price.total,
      priceBreakdown: toPriceRecords(result.price.breakdown),
    };
  }

  /** Zapis warunkowy po statusie (BR-06): równoległa zmiana statusu daje 409, a nie nadpisanie. */
  private async transition(
    current: ReservationState,
    to: ReservationStatus,
    changes: ReservationChanges,
  ): Promise<void> {
    const saved = await this.reservations.updateIf(
      current.id,
      { status: current.status },
      { ...changes, status: to },
    );
    if (!saved) {
      throw new InvalidStatusTransitionError(current.status, to, { concurrent: true });
    }
  }

  /** Pokój musi należeć do obiektu rezerwacji i nie być usunięty, inaczej 404. */
  private async roomOfProperty(roomId: string, propertyId: string): Promise<BookableRoom> {
    const room = await this.availability.findRoomOrFail(roomId);
    if (room.propertyId !== propertyId || room.deletedAt !== null) {
      throw new NotFoundError('Room', roomId);
    }
    return room;
  }

  private async findStateOrFail(id: string, scope: AccessScope): Promise<ReservationState> {
    const state = await this.reservations.findState(id, scope);
    if (!state) {
      throw new NotFoundError('Reservation', id);
    }
    return state;
  }
}

/** Tylko pola, które rzeczywiście się zmieniają (historia `UPDATED` i Q-02). */
function changedFields(
  current: ReservationState,
  input: ReservationUpdateInput,
): ReservationChanges {
  const changes: ReservationChanges = {};
  if (input.internalNotes !== undefined && input.internalNotes !== current.internalNotes) {
    changes.internalNotes = input.internalNotes;
  }
  if (input.guestNotes !== undefined && input.guestNotes !== current.guestNotes) {
    changes.guestNotes = input.guestNotes;
  }
  if (input.guestsCount !== undefined && input.guestsCount !== current.guestsCount) {
    changes.guestsCount = input.guestsCount;
  }
  if (input.roomId !== undefined && input.roomId !== current.roomId) {
    changes.roomId = input.roomId;
  }
  if (input.checkIn && !input.checkIn.equals(current.checkIn)) {
    changes.checkIn = input.checkIn;
  }
  if (input.checkOut && !input.checkOut.equals(current.checkOut)) {
    changes.checkOut = input.checkOut;
  }
  return changes;
}

function toPriceRecords(breakdown: { date: CalendarDate; price: number }[]): NightPriceRecord[] {
  return breakdown.map((night) => ({ date: night.date.toString(), price: night.price }));
}
