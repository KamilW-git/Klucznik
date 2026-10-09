import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { IsCalendarDate } from '../../../common/http/date-fields';
import { ToInt } from '../../../common/http/query-transforms';
import type { RoomQuote } from '../application/availability.service';

const UNAVAILABLE_REASONS = [
  'ROOM_NOT_BOOKABLE',
  'CAPACITY_EXCEEDED',
  'MIN_NIGHTS_NOT_MET',
  'OCCUPIED',
] as const;

export class RoomQuoteQuery {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({
    format: 'date',
    example: '2026-08-18',
    description: 'Dzień wyjazdu; `checkOut ≤ checkIn` → 422 INVALID_STAY_DATES (BR-04)',
  })
  @IsCalendarDate()
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: 99, example: 2 })
  @ToInt()
  @IsInt()
  @Min(1)
  @Max(99)
  guests: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Edytowana rezerwacja: jej termin nie jest kolizją',
  })
  @IsOptional()
  @IsUUID()
  excludeReservationId?: string;
}

export class QuoteConflictDto {
  @ApiProperty({ enum: ['RESERVATION', 'BLOCK'] })
  type: 'RESERVATION' | 'BLOCK';

  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'KL-2026-000123',
    description: 'Tylko rezerwacja',
  })
  number: string | null;

  @ApiProperty({ format: 'date', description: 'Rezerwacja: przyjazd; blokada: pierwsza noc' })
  dateFrom: string;

  @ApiProperty({
    format: 'date',
    description: 'Rezerwacja: wyjazd (`[)`); blokada: ostatnia noc (włącznie)',
  })
  dateTo: string;
}

export class NightPriceDto {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  date: string;

  @ApiProperty({ description: 'Grosze', example: 37000 })
  price: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Stawka sezonowa; `null` = cena bazowa',
  })
  rateId: string | null;
}

/** Wycena pobytu w pokoju dla panelu (Q-17). Niedostępność jest raportowana, a nie zwracana jako 409. */
export class RoomQuoteDto {
  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ format: 'date', example: '2026-08-14' })
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  checkOut: string;

  @ApiProperty({ example: 4 })
  nights: number;

  @ApiProperty()
  available: boolean;

  @ApiProperty({
    enum: UNAVAILABLE_REASONS,
    enumName: 'UnavailableReason',
    nullable: true,
    description: 'Pierwsza niespełniona reguła: BR-13, BR-02, BR-03, BR-01',
  })
  unavailableReason: (typeof UNAVAILABLE_REASONS)[number] | null;

  @ApiProperty({ type: [QuoteConflictDto] })
  conflicts: QuoteConflictDto[];

  @ApiProperty({ example: 3, description: 'BR-03: dla nocy przyjazdu' })
  minNights: number;

  @ApiProperty({ description: 'Grosze (BR-05)', example: 164000 })
  totalPrice: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ type: [NightPriceDto] })
  breakdown: NightPriceDto[];
}

export function toRoomQuoteDto(quote: RoomQuote): RoomQuoteDto {
  return {
    roomId: quote.roomId,
    checkIn: quote.stay.checkIn.toString(),
    checkOut: quote.stay.checkOut.toString(),
    nights: quote.price.nights,
    available: quote.available,
    unavailableReason: quote.unavailableReason,
    conflicts: quote.conflicts.map((conflict) => ({
      type: conflict.type,
      id: conflict.id,
      number: conflict.number,
      dateFrom: conflict.dateFrom.toString(),
      dateTo: conflict.dateTo.toString(),
    })),
    minNights: quote.minNights,
    totalPrice: quote.price.total,
    currency: quote.currency,
    breakdown: quote.price.breakdown.map((night) => ({
      date: night.date.toString(),
      price: night.price,
      rateId: night.rateId,
    })),
  };
}
