import { ApiProperty } from '@nestjs/swagger';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED'] as const;
const SOURCES = ['ONLINE', 'MANUAL'] as const;

export class ReservationRoomRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domek Sosna' })
  name: string;
}

export class ReservationGuestRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Anna' })
  firstName: string;

  @ApiProperty({ example: 'Kowalska' })
  lastName: string;

  @ApiProperty({ type: String, nullable: true, example: 'anna.kowalska@example.com' })
  email: string | null;
}

/** Wiersz listy rezerwacji (docs/features/reservations.md). Pełna lista `/reservations`: M7. */
export class ReservationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'KL-2026-000123' })
  number: string;

  @ApiProperty({ format: 'uuid' })
  propertyId: string;

  @ApiProperty({ type: ReservationRoomRefDto })
  room: ReservationRoomRefDto;

  @ApiProperty({ type: ReservationGuestRefDto })
  guest: ReservationGuestRefDto;

  @ApiProperty({ format: 'date', example: '2026-08-14' })
  checkIn: string;

  @ApiProperty({
    format: 'date',
    example: '2026-08-18',
    description: 'Dzień wyjazdu (zakres `[checkIn, checkOut)`)',
  })
  checkOut: string;

  @ApiProperty({ example: 4 })
  nights: number;

  @ApiProperty({ example: 3 })
  guestsCount: number;

  @ApiProperty({ description: 'Grosze', example: 164000 })
  totalPrice: number;

  @ApiProperty({ example: 'PLN' })
  currency: string;

  @ApiProperty({ enum: STATUSES, enumName: 'ReservationStatus' })
  status: (typeof STATUSES)[number];

  @ApiProperty({ enum: SOURCES, enumName: 'ReservationSource' })
  source: (typeof SOURCES)[number];

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Tylko dla PENDING (BR-07)',
  })
  expiresAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}
