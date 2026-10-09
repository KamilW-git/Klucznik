import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import { OWNERSHIP_POLICY, type OwnershipPolicy } from '../../../common/access/ownership.policy';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import type { DomainError } from '../../../common/domain/domain-error';
import {
  assertStayDates,
  MANUAL_PAST_CHECK_IN_DAYS,
  StayRange,
} from '../../../common/domain/stay-range';
import { NotFoundError } from '../../../common/errors/not-found.error';
import { PricingFacade } from '../../pricing/application/pricing.facade';
import type { PriceQuote } from '../../pricing/domain/calculate-price';
import {
  type Conflict,
  findAvailabilityViolation,
  type UnavailableReason,
  unavailableReasonOf,
} from '../domain/availability';
import {
  AVAILABILITY_REPOSITORY,
  type AvailabilityRepository,
  BLOCKS_REPOSITORY,
  type BlocksRepository,
  type BookableRoom,
} from './ports';

export interface AvailabilityOptions {
  /** BR-04: 0 dla gościa, `MANUAL_PAST_CHECK_IN_DAYS` dla rezerwacji ręcznej (Q-01). */
  allowPastCheckInDays?: number;
  /** BR-03 pominięte przy rezerwacji ręcznej na życzenie właściciela (Q-01). */
  ignoreMinNights?: boolean;
  /** Edycja rezerwacji: jej własny termin nie jest kolizją. */
  excludeReservationId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  unavailableReason: UnavailableReason | null;
  /** Błąd domenowy pierwszej niespełnionej reguły (tryb `assertAvailable`). */
  violation: DomainError | null;
  conflicts: Conflict[];
  minNights: number;
  price: PriceQuote;
  currency: string;
}

export interface RoomQuote extends AvailabilityResult {
  roomId: string;
  stay: StayRange;
}

/**
 * Wspólny algorytm dostępności (docs/features/availability.md#algorytm-dostępności-application--domain)
 * dla wyceny w panelu, dostępności publicznej (M8) i tworzenia rezerwacji (M7).
 */
@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY) private readonly availability: AvailabilityRepository,
    @Inject(BLOCKS_REPOSITORY) private readonly blocks: BlocksRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly pricing: PricingFacade,
  ) {}

  /**
   * Raport dostępności: pierwszy powód niedostępności, kolizje, minimalny pobyt i cena (także dla
   * terminu niedostępnego). Niepoprawne daty (BR-04) zawsze rzucają `InvalidStayDatesError`.
   * Przy tworzeniu rezerwacji wywołujący trzyma zamek pokoju (`lockRoom`) w tej samej transakcji.
   */
  async check(
    room: BookableRoom,
    stay: StayRange,
    guests: number,
    options: AvailabilityOptions = {},
  ): Promise<AvailabilityResult> {
    return (await this.checkRooms([room], stay, guests, options)).get(room.id)!;
  }

  /**
   * `check` dla wielu pokoi w stałej liczbie zapytań (stawki, rezerwacje, blokady), bez N+1.
   * Dostępność publiczna obiektu (docs/features/guest-booking.md).
   */
  async checkRooms(
    rooms: readonly BookableRoom[],
    stay: StayRange,
    guests: number,
    options: AvailabilityOptions = {},
  ): Promise<Map<string, AvailabilityResult>> {
    assertStayDates(stay, this.clock.today(), options); // BR-04
    if (rooms.length === 0) {
      return new Map();
    }
    const nights = stay.toNightsRange();
    const roomIds = rooms.map((room) => room.id);
    const [pricing, reservations, blocks] = await Promise.all([
      this.pricing.quoteRooms(rooms, stay), // BR-03, BR-05
      this.availability.activeReservations(roomIds, nights, options.excludeReservationId), // BR-01
      this.blocks.listForRooms(roomIds, { from: nights.from, to: nights.to }), // BR-01
    ]);

    return new Map(
      rooms.map((room) => {
        const { minNights, price } = pricing.get(room.id)!;
        const conflicts: Conflict[] = [
          ...reservations
            .filter((reservation) => reservation.roomId === room.id)
            .map((reservation): Conflict => ({
              type: 'RESERVATION',
              id: reservation.id,
              number: reservation.number,
              dateFrom: reservation.checkIn,
              dateTo: reservation.checkOut,
            })),
          ...blocks
            .filter((block) => block.roomId === room.id)
            .map((block): Conflict => ({
              type: 'BLOCK',
              id: block.id,
              number: null,
              dateFrom: block.nights.from,
              dateTo: block.nights.to,
            })),
        ].sort((a, b) => a.dateFrom.compare(b.dateFrom));

        const violation = findAvailabilityViolation({
          room,
          property: room.property,
          stay,
          guests,
          minNights,
          conflicts,
          ignoreMinNights: options.ignoreMinNights,
        });
        const result: AvailabilityResult = {
          available: violation === null,
          unavailableReason: violation && unavailableReasonOf(violation),
          violation,
          conflicts,
          minNights,
          price,
          currency: room.property.currency,
        };
        return [room.id, result];
      }),
    );
  }

  /**
   * Zajęte noce pokoi w dniach `[from, to]`: aktywne rezerwacje i blokady (BR-01), bez danych gości.
   * Mini-kalendarz strony publicznej (Q-17).
   */
  async occupiedNights(
    roomIds: readonly string[],
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<Map<string, CalendarDate[]>> {
    const nights = InclusiveDateRange.of(from, to);
    const [reservations, blocks] =
      roomIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.availability.activeReservations(roomIds, nights),
            this.blocks.listForRooms(roomIds, { from, to }),
          ]);
    const occupied = new Map(roomIds.map((id) => [id, new Set<string>()]));
    const mark = (roomId: string, first: CalendarDate, last: CalendarDate): void => {
      const start = first.isBefore(from) ? from : first;
      const end = last.isAfter(to) ? to : last;
      for (let night = start; !night.isAfter(end); night = night.addDays(1)) {
        occupied.get(roomId)?.add(night.toString());
      }
    };
    reservations.forEach((r) => mark(r.roomId, r.checkIn, r.checkOut.addDays(-1)));
    blocks.forEach((block) => mark(block.roomId, block.nights.from, block.nights.to));
    return new Map(
      [...occupied].map(([roomId, set]) => [
        roomId,
        [...set].sort().map((night) => CalendarDate.parse(night)),
      ]),
    );
  }

  /** Aktywne pokoje aktywnego obiektu (BR-13); dostęp do obiektu sprawdza wywołujący. */
  findBookableRooms(propertyId: string): Promise<BookableRoom[]> {
    return this.availability.findBookableRooms(propertyId);
  }

  /** Jak `check`, ale niespełniona reguła rzuca błąd domenowy (BR-01, BR-02, BR-03, BR-13). */
  async assertAvailable(
    room: BookableRoom,
    stay: StayRange,
    guests: number,
    options: AvailabilityOptions = {},
  ): Promise<AvailabilityResult> {
    const result = await this.check(room, stay, guests, options);
    if (result.violation) {
      throw result.violation;
    }
    return result;
  }

  /**
   * `GET /rooms/:id/quote` (Q-17): wycena dla rezerwacji ręcznej w panelu. Raportuje niedostępność
   * zamiast 409; BR-04 jak dla rezerwacji ręcznej (przyjazd do 30 dni wstecz, Q-01).
   */
  async quote(
    roomId: string,
    scope: AccessScope,
    query: {
      checkIn: CalendarDate;
      checkOut: CalendarDate;
      guests: number;
      excludeReservationId?: string;
    },
  ): Promise<RoomQuote> {
    await this.ownership.assertRoom(roomId, scope); // BR-12
    const room = await this.findRoomOrFail(roomId);
    const stay = StayRange.of(query.checkIn, query.checkOut); // BR-04: wyjazd po przyjeździe
    const result = await this.check(room, stay, query.guests, {
      allowPastCheckInDays: MANUAL_PAST_CHECK_IN_DAYS,
      excludeReservationId: query.excludeReservationId,
    });
    return { ...result, roomId, stay };
  }

  /**
   * BR-01: zamek `FOR UPDATE` na pokoju w bieżącej transakcji. Bierze go tworzenie i zmiana terminu
   * rezerwacji, blokady terminów i BR-10, więc sprawdzenie kolizji i zapis nie wyścigną się.
   */
  lockRoom(roomId: string): Promise<void> {
    return this.availability.lockRoom(roomId);
  }

  /** Bez sprawdzenia dostępu: wywołujący zweryfikował obiekt lub pokój (BR-12). */
  async findRoomOrFail(roomId: string): Promise<BookableRoom> {
    const room = await this.availability.findRoom(roomId);
    if (!room) {
      throw new NotFoundError('Room', roomId);
    }
    return room;
  }
}
