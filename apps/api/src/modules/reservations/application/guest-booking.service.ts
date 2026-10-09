import { Inject, Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { StayRange } from '../../../common/domain/stay-range';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { AvailabilityService } from '../../availability/application/availability.service';
import { GuestsService } from '../../guests/application/guests.service';
import { PhotosService } from '../../photos/application/photos.service';
import type { Photo } from '../../photos/application/ports';
import {
  assertGuestCanCancel,
  canGuestCancel,
  guestCancellationDeadline,
} from '../domain/cancellation-policy';
import { InvalidStatusTransitionError } from '../domain/errors';
import { isGuestTokenValid } from '../domain/guest-access-token';
import { formatReservationNumber } from '../domain/reservation-number';
import type { ReservationStatus } from '../domain/reservation-status';
import { generateGuestToken, hashGuestToken } from './guest-token';
import {
  type GuestReservationRecord,
  RESERVATIONS_REPOSITORY,
  type ReservationsRepository,
} from './reservation-ports';

const HOUR_MS = 3_600_000;

/** Obiekt ze strony publicznej (aktywny, nieusunięty), w którym gość rezerwuje. */
export interface BookingProperty {
  id: string;
  pendingExpiryHours: number;
}

export interface OnlineReservationInput {
  roomId: string;
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  guestsCount: number;
  guest: { firstName: string; lastName: string; email: string; phone: string };
  guestNotes: string | null;
}

export interface OnlineReservationCreated {
  number: string;
  status: ReservationStatus;
  room: { name: string };
  checkIn: CalendarDate;
  checkOut: CalendarDate;
  nights: number;
  guestsCount: number;
  totalPrice: number;
  currency: string;
  expiresAt: Date;
  guestEmail: string;
}

/** Widok gościa; `id` zostaje w serwerze, DTO publiczne go nie zawiera. */
export interface GuestReservationView extends Omit<GuestReservationRecord, 'room'> {
  room: { name: string; coverPhoto: Photo | null };
  nights: number;
  canCancel: boolean;
  /** BR-08: ostatni dzień bezpłatnego anulowania (`PENDING`/`CONFIRMED`), inaczej `null`. */
  cancellableUntil: CalendarDate | null;
}

/**
 * Proces gościa bez konta (docs/features/guest-booking.md): prośba o rezerwację online oraz podgląd
 * i anulowanie przez token z linku w e-mailu. Token w bazie tylko jako SHA-256.
 */
@Injectable()
export class GuestBookingService {
  constructor(
    @Inject(RESERVATIONS_REPOSITORY) private readonly reservations: ReservationsRepository,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly availability: AvailabilityService,
    private readonly guests: GuestsService,
    private readonly photos: PhotosService,
  ) {}

  /** Prośba o rezerwację: `PENDING` z `expiresAt` (BR-07), cena z serwera (BR-05). */
  async createOnline(
    property: BookingProperty,
    input: OnlineReservationInput,
  ): Promise<OnlineReservationCreated> {
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + property.pendingExpiryHours * HOUR_MS);
    const created = await this.tx.run(async () => {
      const room = await this.availability.findRoomOrFail(input.roomId);
      if (room.propertyId !== property.id || room.deletedAt !== null) {
        throw new NotFoundError('Room', input.roomId);
      }
      // BR-01: zamek pokoju, potem kolizje i zapis w tej samej transakcji.
      await this.availability.lockRoom(room.id);
      const stay = StayRange.of(input.checkIn, input.checkOut); // BR-04
      // Gość: wszystkie reguły bez wyjątków Q-01 (BR-01…05, BR-13).
      const { price, currency } = await this.availability.assertAvailable(
        room,
        stay,
        input.guestsCount,
      );
      const guestId = await this.guests.resolveForReservation(property.id, input.guest); // Q-04
      const year = Number(this.clock.today().toString().slice(0, 4));
      const number = formatReservationNumber(year, await this.reservations.nextSequence(year));
      const { token, hash } = generateGuestToken();
      const reservationId = await this.reservations.create({
        number,
        propertyId: property.id,
        roomId: room.id,
        guestId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guestsCount: input.guestsCount,
        status: 'PENDING',
        source: 'ONLINE',
        totalPrice: price.total,
        currency,
        priceBreakdown: price.breakdown.map((night) => ({
          date: night.date.toString(),
          price: night.price,
        })),
        guestNotes: input.guestNotes,
        internalNotes: null,
        confirmedAt: null,
        expiresAt,
        guestAccessTokenHash: hash,
      });
      await this.reservations.addEvent({
        reservationId,
        type: 'CREATED',
        actorType: 'GUEST',
        actorUserId: null,
        payload: { source: 'ONLINE', status: 'PENDING' },
      });
      return { reservationId, token, number, room, stay, price, currency };
    });
    // M9: po commicie ReservationCreated({ reservationId, source: 'ONLINE', guestAccessToken: token }):
    // surowy token trafia wyłącznie do linku `/r/:token` w e-mailu, nigdy do odpowiedzi ani logów.

    return {
      number: created.number,
      status: 'PENDING',
      room: { name: created.room.name },
      checkIn: created.stay.checkIn,
      checkOut: created.stay.checkOut,
      nights: created.stay.nights(),
      guestsCount: input.guestsCount,
      totalPrice: created.price.total,
      currency: created.currency,
      expiresAt,
      guestEmail: input.guest.email.trim().toLowerCase(),
    };
  }

  async getByToken(token: string): Promise<GuestReservationView> {
    const record = await this.findByTokenOrFail(token);
    const [cover] = (await this.photos.listForRooms([record.room.id])).get(record.room.id) ?? [];
    const today = this.clock.today();
    const deadlineApplies = record.status === 'PENDING' || record.status === 'CONFIRMED';
    const { room, ...rest } = record;
    return {
      ...rest,
      room: { name: room.name, coverPhoto: cover ?? null },
      nights: record.checkOut.diffDays(record.checkIn),
      canCancel: canGuestCancel(record, record.property, today), // BR-08
      cancellableUntil: deadlineApplies
        ? guestCancellationDeadline(record.checkIn, record.property.cancellationDeadlineDays)
        : null,
    };
  }

  // BR-06, BR-08: gość anuluje z linku; `cancelledBy = GUEST`.
  async cancelByToken(token: string, reason: string | null): Promise<GuestReservationView> {
    await this.tx.run(async () => {
      const record = await this.findByTokenOrFail(token);
      assertGuestCanCancel(record, record.property, this.clock.today());
      const saved = await this.reservations.updateIf(
        record.id,
        { status: record.status },
        {
          status: 'CANCELLED',
          cancelledAt: this.clock.now(),
          cancelledBy: 'GUEST',
          cancellationReason: reason,
        },
      );
      if (!saved) {
        throw new InvalidStatusTransitionError(record.status, 'CANCELLED', { concurrent: true });
      }
      await this.reservations.addEvent({
        reservationId: record.id,
        type: 'CANCELLED',
        actorType: 'GUEST',
        actorUserId: null,
        payload: reason ? { reason } : undefined,
      });
    });
    // M9: ReservationCancelled({ cancelledBy: 'GUEST' }) po commicie (e-mail do gościa i właściciela).
    return this.getByToken(token);
  }

  /** Nieznany token i link po `checkOut + 30 dni` (Q-11) → ten sam 404. */
  private async findByTokenOrFail(token: string): Promise<GuestReservationRecord> {
    const record = await this.reservations.findByGuestTokenHash(hashGuestToken(token));
    if (!record || !isGuestTokenValid(record.checkOut, this.clock.today())) {
      throw new NotFoundError('Reservation');
    }
    return record;
  }
}
