import { ApiProperty } from '@nestjs/swagger';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import type { Calendar } from '../application/ports';

/** Najdłuższy widok kalendarza: 3 miesiące (docs/features/availability.md). */
export const MAX_CALENDAR_DAYS = 93;

export class CalendarQuery {
  @ApiProperty({ format: 'date', example: '2026-08-01', description: 'Pierwszy dzień widoku' })
  @IsCalendarDate()
  from: string;

  @ApiProperty({
    format: 'date',
    example: '2026-08-31',
    description: `Ostatni dzień widoku (włącznie), ≥ from, maks. ${MAX_CALENDAR_DAYS} dni`,
  })
  @IsCalendarDate()
  @IsRangeEnd('from', MAX_CALENDAR_DAYS)
  to: string;
}

export class CalendarRoomDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domek Sosna' })
  name: string;

  @ApiProperty()
  isActive: boolean;
}

export class CalendarReservationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ example: 'KL-2026-000123' })
  number: string;

  @ApiProperty({ format: 'date', example: '2026-08-14' })
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18', description: 'Dzień wyjazdu (`[)`)' })
  checkOut: string;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'COMPLETED'] })
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';

  @ApiProperty({ enum: ['ONLINE', 'MANUAL'], enumName: 'ReservationSource' })
  source: 'ONLINE' | 'MANUAL';

  @ApiProperty({ example: 'Anna Kowalska' })
  guestName: string;

  @ApiProperty({ example: 3 })
  guestsCount: number;

  @ApiProperty({ description: 'Grosze', example: 164000 })
  totalPrice: number;
}

export class CalendarBlockDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ format: 'date', example: '2026-08-20' })
  dateFrom: string;

  @ApiProperty({ format: 'date', example: '2026-08-22', description: 'Ostatnia noc (włącznie)' })
  dateTo: string;

  @ApiProperty({ type: String, nullable: true, example: 'Remont' })
  reason: string | null;
}

/** Kalendarz obłożenia: pokoje, rezerwacje i blokady przecinające dni `[from, to]`. */
export class CalendarDto {
  @ApiProperty({ format: 'date', example: '2026-08-01' })
  from: string;

  @ApiProperty({ format: 'date', example: '2026-08-31' })
  to: string;

  @ApiProperty({ type: [CalendarRoomDto], description: 'Bez usuniętych, sort po nazwie' })
  rooms: CalendarRoomDto[];

  @ApiProperty({ type: [CalendarReservationDto], description: 'PENDING, CONFIRMED, COMPLETED' })
  reservations: CalendarReservationDto[];

  @ApiProperty({ type: [CalendarBlockDto] })
  blocks: CalendarBlockDto[];
}

export function toCalendarDto(from: string, to: string, calendar: Calendar): CalendarDto {
  return {
    from,
    to,
    rooms: calendar.rooms,
    reservations: calendar.reservations.map((reservation) => ({
      ...reservation,
      checkIn: reservation.checkIn.toString(),
      checkOut: reservation.checkOut.toString(),
    })),
    blocks: calendar.blocks.map((block) => ({
      id: block.id,
      roomId: block.roomId,
      dateFrom: block.nights.from.toString(),
      dateTo: block.nights.to.toString(),
      reason: block.reason,
    })),
  };
}
