import { Inject, Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { type Clock, CLOCK } from '../../../common/domain/clock';
import { StayRange } from '../../../common/domain/stay-range';
import { NotFoundError } from '../../../common/errors/not-found.error';
import {
  type AvailabilityResult,
  AvailabilityService,
} from '../../availability/application/availability.service';
import { PhotosService } from '../../photos/application/photos.service';
import type { Photo } from '../../photos/application/ports';
import {
  GuestBookingService,
  type GuestReservationView,
  type OnlineReservationCreated,
  type OnlineReservationInput,
} from '../../reservations/application/guest-booking.service';
import {
  PUBLIC_PROPERTIES_REPOSITORY,
  type PublicPropertiesRepository,
  type PublicProperty,
  type PublicRoom,
} from './ports';

export interface PublicRoomView extends PublicRoom {
  photos: Photo[];
}

export interface PublicPropertyView extends PublicProperty {
  photos: Photo[];
  rooms: PublicRoomView[];
}

export interface PublicAvailability {
  stay: StayRange;
  guests: number;
  currency: string;
  rooms: { room: PublicRoomView; result: AvailabilityResult }[];
}

/**
 * Strona publiczna obiektu i proces gościa (docs/features/guest-booking.md). Nieaktywny lub usunięty
 * obiekt → 404 (BR-13). Dane innych rezerwacji nigdy nie trafiają do odpowiedzi.
 */
@Injectable()
export class PublicBookingService {
  constructor(
    @Inject(PUBLIC_PROPERTIES_REPOSITORY) private readonly properties: PublicPropertiesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly availability: AvailabilityService,
    private readonly photos: PhotosService,
    private readonly booking: GuestBookingService,
  ) {}

  async getProperty(slug: string): Promise<PublicPropertyView> {
    const property = await this.findPropertyOrFail(slug);
    const [photos, rooms] = await Promise.all([
      this.photos.listForProperty(property.id),
      this.roomsOf(property),
    ]);
    return { ...property, photos, rooms };
  }

  /** Q-17: wszystkie aktywne pokoje z powodem niedostępności (P2), jednym zestawem zapytań. */
  async checkAvailability(
    slug: string,
    query: { checkIn: CalendarDate; checkOut: CalendarDate; guests: number },
  ): Promise<PublicAvailability> {
    const property = await this.findPropertyOrFail(slug);
    const stay = StayRange.of(query.checkIn, query.checkOut); // BR-04
    const [rooms, bookable] = await Promise.all([
      this.roomsOf(property),
      this.availability.findBookableRooms(property.id),
    ]);
    const results = await this.availability.checkRooms(bookable, stay, query.guests);
    return {
      stay,
      guests: query.guests,
      currency: property.currency,
      rooms: rooms
        .filter((room) => results.has(room.id))
        .map((room) => ({ room, result: results.get(room.id)! })),
    };
  }

  /** Q-17: zajęte noce aktywnych pokoi (mini-kalendarz P2), bez danych gości. */
  async occupancy(
    slug: string,
    from: CalendarDate,
    to: CalendarDate,
  ): Promise<{ roomId: string; occupiedNights: CalendarDate[] }[]> {
    const property = await this.findPropertyOrFail(slug);
    const rooms = await this.availability.findBookableRooms(property.id);
    const occupied = await this.availability.occupiedNights(
      rooms.map((room) => room.id),
      from,
      to,
    );
    return rooms.map((room) => ({ roomId: room.id, occupiedNights: occupied.get(room.id) ?? [] }));
  }

  async createReservation(
    slug: string,
    input: OnlineReservationInput,
  ): Promise<OnlineReservationCreated> {
    const property = await this.findPropertyOrFail(slug);
    return this.booking.createOnline(property, input);
  }

  getReservation(token: string): Promise<GuestReservationView> {
    return this.booking.getByToken(token);
  }

  cancelReservation(token: string, reason: string | null): Promise<GuestReservationView> {
    return this.booking.cancelByToken(token, reason);
  }

  private async roomsOf(property: PublicProperty): Promise<PublicRoomView[]> {
    const rooms = await this.properties.listRooms(property.id, this.clock.today());
    const photos = await this.photos.listForRooms(rooms.map((room) => room.id));
    return rooms.map((room) => ({ ...room, photos: photos.get(room.id) ?? [] }));
  }

  private async findPropertyOrFail(slug: string): Promise<PublicProperty> {
    const property = await this.properties.findBySlug(slug);
    if (!property) {
      throw new NotFoundError('Property', slug);
    }
    return property;
  }
}
