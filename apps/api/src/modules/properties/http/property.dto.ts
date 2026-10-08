import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PhotoDto, toPhotoDto } from '../../photos/http/photo.dto';
import { ReservationListItemDto } from '../../reservations/http/reservation-list-item.dto';
import type { PropertyView } from '../application/properties.service';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../domain/slug';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const POSTAL_CODE = /^\d{2}-\d{3}$/;
const nullable = ValidateIf((_: object, value: unknown) => value !== null);
const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// --- Wejście -----------------------------------------------------------------

export class CreatePropertyDto {
  @ApiProperty({ example: 'Domki Leśna Polana', minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({
    description: 'Adres strony `/o/:slug`; bez niego generowany z nazwy',
    example: 'lesna-polana',
    pattern: SLUG_PATTERN.source,
    minLength: SLUG_MIN_LENGTH,
    maxLength: SLUG_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(SLUG_MIN_LENGTH, SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug may contain only a-z, 0-9 and single dashes' })
  slug?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @nullable
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ example: 'Leśna 12', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  street: string;

  @ApiProperty({ example: '11-730', pattern: POSTAL_CODE.source })
  @IsString()
  @Matches(POSTAL_CODE, { message: 'postalCode must match NN-NNN' })
  postalCode: string;

  @ApiProperty({ example: 'Mikołajki', minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  city: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 30, example: '+48 600 100 200' })
  @IsOptional()
  @nullable
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'kontakt@lesnapolana.example.com' })
  @IsOptional()
  @nullable
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string | null;

  @ApiPropertyOptional({ example: '15:00', pattern: TIME.source, default: '15:00' })
  @IsOptional()
  @Matches(TIME, { message: 'checkInTime must be HH:mm' })
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00', pattern: TIME.source, default: '11:00' })
  @IsOptional()
  @Matches(TIME, { message: 'checkOutTime must be HH:mm' })
  checkOutTime?: string;

  @ApiPropertyOptional({
    description: 'Bezpłatne anulowanie do N dni przed przyjazdem (BR-08)',
    minimum: 0,
    maximum: 60,
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  cancellationDeadlineDays?: number;

  @ApiPropertyOptional({
    description: 'Czas na potwierdzenie rezerwacji online w godzinach (BR-07)',
    minimum: 1,
    maximum: 168,
    default: 48,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  pendingExpiryHours?: number;

  @ApiPropertyOptional({
    description: 'Nieaktywny obiekt nie przyjmuje rezerwacji (BR-13)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Właściciel: tylko i obowiązkowo dla ADMIN' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

/** Wszystkie pola opcjonalne; `isActive: false` przy przyszłych rezerwacjach → 409 (BR-10). */
export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['ownerId'] as const),
) {}

export class ListPropertiesQuery {
  @ApiPropertyOptional({ format: 'uuid', description: 'Tylko ADMIN: obiekty jednego właściciela' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

// --- Wyjście -----------------------------------------------------------------

export class PropertyListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domki Leśna Polana' })
  name: string;

  @ApiProperty({ example: 'lesna-polana' })
  slug: string;

  @ApiProperty({ type: String, nullable: true, example: 'Mikołajki' })
  city: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ example: 4 })
  roomsCount: number;
}

export class PropertyListDto {
  @ApiProperty({ type: [PropertyListItemDto] })
  data: PropertyListItemDto[];
}

export class PropertyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  ownerId: string;

  @ApiProperty({ example: 'Domki Leśna Polana' })
  name: string;

  @ApiProperty({ example: 'lesna-polana' })
  slug: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Leśna 12' })
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

  @ApiProperty({ example: 7 })
  cancellationDeadlineDays: number;

  @ApiProperty({ example: 48 })
  pendingExpiryHours: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: PhotoDto, nullable: true, description: 'Pierwsze zdjęcie galerii obiektu' })
  coverPhoto: PhotoDto | null;

  @ApiProperty({ type: [PhotoDto], description: 'Zdjęcia obiektu (bez zdjęć pokoi)' })
  photos: PhotoDto[];

  @ApiProperty({ example: 'http://localhost:8080/o/lesna-polana' })
  publicUrl: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export function toPropertyDto(view: PropertyView): PropertyDto {
  const photos = view.photos.map(toPhotoDto);
  return {
    id: view.id,
    ownerId: view.ownerId,
    name: view.name,
    slug: view.slug,
    description: view.description,
    street: view.street,
    postalCode: view.postalCode,
    city: view.city,
    phone: view.phone,
    contactEmail: view.contactEmail,
    checkInTime: view.checkInTime,
    checkOutTime: view.checkOutTime,
    cancellationDeadlineDays: view.cancellationDeadlineDays,
    pendingExpiryHours: view.pendingExpiryHours,
    currency: view.currency,
    isActive: view.isActive,
    coverPhoto: photos[0] ?? null,
    photos,
    publicUrl: view.publicUrl,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

// --- Pulpit ------------------------------------------------------------------

export class OccupancyDayDto {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  date: string;

  @ApiProperty({ example: 3 })
  occupiedRooms: number;

  @ApiProperty({ description: 'Aktywne pokoje obiektu', example: 4 })
  totalRooms: number;
}

export class DashboardDto {
  @ApiProperty({ description: 'CONFIRMED z przyjazdem dziś', example: 2 })
  arrivalsToday: number;

  @ApiProperty({ description: 'CONFIRMED z wyjazdem dziś', example: 1 })
  departuresToday: number;

  @ApiProperty({ description: 'Rezerwacje PENDING', example: 3 })
  pendingCount: number;

  @ApiProperty({
    description: '% zajętych nocy aktywnych pokoi w bieżącym miesiącu (0–100)',
    example: 64,
  })
  occupancyThisMonth: number;

  @ApiProperty({ type: [ReservationListItemDto], description: 'Do 10 najstarszych PENDING' })
  pendingReservations: ReservationListItemDto[];

  @ApiProperty({
    type: [ReservationListItemDto],
    description: 'CONFIRMED z przyjazdem w ciągu 7 dni',
  })
  upcomingArrivals: ReservationListItemDto[];

  @ApiProperty({ type: [OccupancyDayDto], description: 'Kolejne 30 dni od dziś' })
  occupancyNext30Days: OccupancyDayDto[];
}
