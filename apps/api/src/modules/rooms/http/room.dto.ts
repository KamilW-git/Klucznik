import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { ToBoolean } from '../../../common/http/query-transforms';
import { PhotoDto, toPhotoDto } from '../../photos/http/photo.dto';
import type { RoomView } from '../application/rooms.service';

export class CreateRoomDto {
  @ApiProperty({ example: 'Domek Sosna', minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({
    description: 'Maksymalna liczba gości (BR-02)',
    minimum: 1,
    maximum: 30,
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(30)
  capacity: number;

  @ApiProperty({
    description: 'Cena bazowa za noc w groszach (BR-05)',
    minimum: 0,
    maximum: 10_000_000,
    example: 37000,
  })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  basePricePerNight: number;

  @ApiPropertyOptional({
    description: 'Minimalna liczba nocy (BR-03)',
    minimum: 1,
    maximum: 30,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  minNights?: number;

  @ApiPropertyOptional({
    description: 'Widoczny na stronie i dostępny do rezerwacji (BR-13)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Wszystkie pola opcjonalne; `isActive: false` przy przyszłych rezerwacjach → 409 (BR-10). */
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

export class ListRoomsQuery {
  @ApiPropertyOptional({ description: 'Także pokoje ukryte (`isActive: false`)', default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeInactive: boolean = true;
}

export class RoomDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  propertyId: string;

  @ApiProperty({ example: 'Domek Sosna' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ example: 4 })
  capacity: number;

  @ApiProperty({ description: 'Grosze', example: 37000 })
  basePricePerNight: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ example: 1 })
  minNights: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: PhotoDto, nullable: true, description: 'Pierwsze zdjęcie galerii' })
  coverPhoto: PhotoDto | null;

  @ApiProperty({ type: [PhotoDto] })
  photos: PhotoDto[];

  @ApiProperty({ description: 'Rezerwacje PENDING/CONFIRMED z wyjazdem po dziś', example: 3 })
  upcomingReservationsCount: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class RoomListDto {
  @ApiProperty({ type: [RoomDto] })
  data: RoomDto[];
}

export function toRoomDto(room: RoomView): RoomDto {
  const photos = room.photos.map(toPhotoDto);
  return {
    id: room.id,
    propertyId: room.propertyId,
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    basePricePerNight: room.basePricePerNight,
    currency: room.currency,
    minNights: room.minNights,
    isActive: room.isActive,
    coverPhoto: photos[0] ?? null,
    photos,
    upcomingReservationsCount: room.upcomingReservationsCount,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}
