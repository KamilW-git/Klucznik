import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import { ToInt } from '../../../common/http/query-transforms';
import { PhotoDto, toPhotoDto } from '../../photos/http/photo.dto';
import type { OnlineReservationCreated } from '../../reservations/application/guest-booking.service';
import type { GuestReservationView } from '../../reservations/application/guest-booking.service';
import type {
  PublicAvailability,
  PublicPropertyView,
  PublicRoomView,
} from '../application/public-booking.service';

/** Najdłuższy zakres mini-kalendarza zajętości (jak kalendarz panelu). */
export const MAX_OCCUPANCY_DAYS = 93;

const PUBLIC_UNAVAILABLE_REASONS = ['OCCUPIED', 'CAPACITY_EXCEEDED', 'MIN_NIGHTS_NOT_MET'] as const;
const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED'] as const;

// --- Zapytania i wejście -----------------------------------------------------

export class PublicAvailabilityQuery {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18', description: 'Dzień wyjazdu (`[)`)' })
  @IsCalendarDate()
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: 99, example: 2 })
  @ToInt()
  @IsInt()
  @Min(1)
  @Max(99)
  guests: number;
}

export class PublicOccupancyQuery {
  @ApiProperty({ format: 'date', example: '2026-08-01' })
  @IsCalendarDate()
  from: string;

  @ApiProperty({
    format: 'date',
    example: '2026-08-31',
    description: `Włącznie, ≥ from, maks. ${MAX_OCCUPANCY_DAYS} dni`,
  })
  @IsCalendarDate()
  @IsRangeEnd('from', MAX_OCCUPANCY_DAYS)
  to: string;
}

export class PublicGuestInputDto {
  @ApiProperty({ example: 'Anna', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Kowalska', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ example: 'anna.kowalska@example.com', description: 'Wymagany online (Q-03)' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '+48 600 100 200', minLength: 3, maxLength: 30 })
  @IsString()
  @Length(3, 30)
  phone: string;
}

/** Prośba o rezerwację. Bez pola ceny (BR-05): nieznane pola → 400. */
export class CreatePublicReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ format: 'date', example: '2026-08-14' })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  @IsCalendarDate()
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: 99, example: 2 })
  @IsInt()
  @Min(1)
  @Max(99)
  guestsCount: number;

  @ApiProperty({ type: PublicGuestInputDto })
  @ValidateNested()
  @Type(() => PublicGuestInputDto)
  guest: PublicGuestInputDto;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  guestNotes?: string | null;
}

export class PublicCancelReservationDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500, example: 'Zmiana planów' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

// --- Wyjście -----------------------------------------------------------------

export class PublicRoomDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domek Sosna' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ example: 4 })
  capacity: number;

  @ApiProperty({ example: 2, description: 'Minimalny pobyt poza sezonem (BR-03)' })
  minNights: number;

  @ApiProperty({ example: 37000, description: 'Cena „od” za noc w groszach' })
  priceFrom: number;

  @ApiProperty({ type: [PhotoDto] })
  photos: PhotoDto[];
}

export class PublicPropertyDto {
  @ApiProperty({ example: 'Zielona Zagroda' })
  name: string;

  @ApiProperty({ example: 'zielona-zagroda' })
  slug: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Polna 1' })
  street: string | null;

  @ApiProperty({ type: String, nullable: true, example: '11-730' })
  postalCode: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Mikołajki' })
  city: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone: string | null;

  @ApiProperty({ type: String, nullable: true })
  contactEmail: string | null;

  @ApiProperty({ example: '15:00' })
  checkInTime: string;

  @ApiProperty({ example: '11:00' })
  checkOutTime: string;

  @ApiProperty({ example: 7, description: 'BR-08' })
  cancellationDeadlineDays: number;

  @ApiProperty({ example: 48, description: 'BR-07' })
  pendingExpiryHours: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ type: [PhotoDto] })
  photos: PhotoDto[];

  @ApiProperty({ type: [PublicRoomDto], description: 'Tylko pokoje aktywne' })
  rooms: PublicRoomDto[];
}

export class PublicNightPriceDto {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  date: string;

  @ApiProperty({ description: 'Grosze', example: 37000 })
  price: number;
}

export class RoomAvailabilityDto {
  @ApiProperty({ type: PublicRoomDto })
  room: PublicRoomDto;

  @ApiProperty()
  available: boolean;

  @ApiProperty({
    enum: PUBLIC_UNAVAILABLE_REASONS,
    enumName: 'PublicUnavailableReason',
    nullable: true,
  })
  unavailableReason: (typeof PUBLIC_UNAVAILABLE_REASONS)[number] | null;

  @ApiProperty({ example: 3, description: 'BR-03: dla nocy przyjazdu' })
  minNights: number;

  @ApiProperty({ type: Number, nullable: true, example: 164000, description: 'Tylko dostępne' })
  totalPrice: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 41000, description: 'Zaokrąglona' })
  averagePricePerNight: number | null;

  @ApiProperty({ type: [PublicNightPriceDto], nullable: true })
  breakdown: PublicNightPriceDto[] | null;
}

export class AvailabilityResultDto {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  checkOut: string;

  @ApiProperty({ example: 4 })
  nights: number;

  @ApiProperty({ example: 2 })
  guests: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ type: [RoomAvailabilityDto], description: 'Wszystkie aktywne pokoje (Q-17)' })
  rooms: RoomAvailabilityDto[];
}

export class RoomOccupancyDto {
  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ type: [String], format: 'date', example: ['2026-08-14', '2026-08-15'] })
  occupiedNights: string[];
}

export class PublicOccupancyDto {
  @ApiProperty({ format: 'date' })
  from: string;

  @ApiProperty({ format: 'date' })
  to: string;

  @ApiProperty({ type: [RoomOccupancyDto] })
  rooms: RoomOccupancyDto[];
}

export class PublicReservationCreatedDto {
  @ApiProperty({ example: 'KL-2026-000123' })
  number: string;

  @ApiProperty({ enum: ['PENDING'] })
  status: 'PENDING';

  @ApiProperty({ example: { name: 'Domek Sosna' } })
  room: { name: string };

  @ApiProperty({ format: 'date' })
  checkIn: string;

  @ApiProperty({ format: 'date' })
  checkOut: string;

  @ApiProperty({ example: 4 })
  nights: number;

  @ApiProperty({ example: 2 })
  guestsCount: number;

  @ApiProperty({ description: 'Grosze', example: 164000 })
  totalPrice: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ format: 'date-time', description: 'BR-07: bez potwierdzenia rezerwacja wygasa' })
  expiresAt: Date;

  @ApiProperty({ example: 'anna.kowalska@example.com', description: 'Tu trafi link do rezerwacji' })
  guestEmail: string;
}

export class PublicReservationPropertyDto {
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) contactEmail: string | null;
  @ApiProperty({ type: String, nullable: true }) street: string | null;
  @ApiProperty({ type: String, nullable: true }) postalCode: string | null;
  @ApiProperty({ type: String, nullable: true }) city: string | null;
  @ApiProperty({ example: '15:00' }) checkInTime: string;
  @ApiProperty({ example: '11:00' }) checkOutTime: string;
}

export class PublicReservationRoomDto {
  @ApiProperty({ example: 'Domek Sosna' })
  name: string;

  @ApiProperty({ type: PhotoDto, nullable: true })
  coverPhoto: PhotoDto | null;
}

/** Rezerwacja z linku `/r/:token`: bez `internalNotes` i danych innych rezerwacji. */
export class PublicReservationDto {
  @ApiProperty({ example: 'KL-2026-000123' })
  number: string;

  @ApiProperty({ enum: STATUSES, enumName: 'ReservationStatus' })
  status: (typeof STATUSES)[number];

  @ApiProperty({ type: PublicReservationPropertyDto })
  property: PublicReservationPropertyDto;

  @ApiProperty({ type: PublicReservationRoomDto })
  room: PublicReservationRoomDto;

  @ApiProperty({ format: 'date' })
  checkIn: string;

  @ApiProperty({ format: 'date' })
  checkOut: string;

  @ApiProperty({ example: 4 })
  nights: number;

  @ApiProperty({ example: 2 })
  guestsCount: number;

  @ApiProperty({ description: 'Grosze', example: 164000 })
  totalPrice: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ type: String, nullable: true })
  guestNotes: string | null;

  @ApiProperty({ description: 'BR-08: czy gość może teraz anulować' })
  canCancel: boolean;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'BR-08: ostatni dzień bezpłatnego anulowania (PENDING/CONFIRMED)',
  })
  cancellableUntil: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt: Date | null;
}

// --- Mapowanie -----------------------------------------------------------------

function toPublicRoomDto(room: PublicRoomView): PublicRoomDto {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    minNights: room.minNights,
    priceFrom: room.priceFrom,
    photos: room.photos.map(toPhotoDto),
  };
}

export function toPublicPropertyDto(property: PublicPropertyView): PublicPropertyDto {
  return {
    name: property.name,
    slug: property.slug,
    description: property.description,
    street: property.street,
    postalCode: property.postalCode,
    city: property.city,
    phone: property.phone,
    contactEmail: property.contactEmail,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    cancellationDeadlineDays: property.cancellationDeadlineDays,
    pendingExpiryHours: property.pendingExpiryHours,
    currency: property.currency,
    photos: property.photos.map(toPhotoDto),
    rooms: property.rooms.map(toPublicRoomDto),
  };
}

export function toAvailabilityResultDto(availability: PublicAvailability): AvailabilityResultDto {
  const nights = availability.stay.nights();
  return {
    checkIn: availability.stay.checkIn.toString(),
    checkOut: availability.stay.checkOut.toString(),
    nights,
    guests: availability.guests,
    currency: availability.currency,
    rooms: availability.rooms.map(({ room, result }) => ({
      room: toPublicRoomDto(room),
      available: result.available,
      // Pokoje są aktywne, więc ROOM_NOT_BOOKABLE nie występuje; kolizji nie ujawniamy.
      unavailableReason: result.unavailableReason as RoomAvailabilityDto['unavailableReason'],
      minNights: result.minNights,
      totalPrice: result.available ? result.price.total : null,
      averagePricePerNight: result.available ? Math.round(result.price.total / nights) : null,
      breakdown: result.available
        ? result.price.breakdown.map((night) => ({
            date: night.date.toString(),
            price: night.price,
          }))
        : null,
    })),
  };
}

export function toPublicReservationCreatedDto(
  created: OnlineReservationCreated,
): PublicReservationCreatedDto {
  return {
    number: created.number,
    status: 'PENDING',
    room: created.room,
    checkIn: created.checkIn.toString(),
    checkOut: created.checkOut.toString(),
    nights: created.nights,
    guestsCount: created.guestsCount,
    totalPrice: created.totalPrice,
    currency: created.currency,
    expiresAt: created.expiresAt,
    guestEmail: created.guestEmail,
  };
}

export function toPublicReservationDto(view: GuestReservationView): PublicReservationDto {
  const { property } = view;
  return {
    number: view.number,
    status: view.status,
    property: {
      name: property.name,
      slug: property.slug,
      phone: property.phone,
      contactEmail: property.contactEmail,
      street: property.street,
      postalCode: property.postalCode,
      city: property.city,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
    },
    room: {
      name: view.room.name,
      coverPhoto: view.room.coverPhoto && toPhotoDto(view.room.coverPhoto),
    },
    checkIn: view.checkIn.toString(),
    checkOut: view.checkOut.toString(),
    nights: view.nights,
    guestsCount: view.guestsCount,
    totalPrice: view.totalPrice,
    currency: view.currency,
    guestNotes: view.guestNotes,
    canCancel: view.canCancel,
    cancellableUntil: view.cancellableUntil?.toString() ?? null,
    cancelledAt: view.cancelledAt,
  };
}
