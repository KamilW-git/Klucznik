import { ApiProperty, ApiPropertyOptional, IntersectionType, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import { Paginated, PaginationQuery } from '../../../common/http/pagination';
import { Trim } from '../../../common/http/query-transforms';
import { SortQuery } from '../../../common/http/sort';
import type { ReservationDetail } from '../application/reservation-ports';
import { RESERVATION_SOURCES, RESERVATION_STATUSES } from '../domain/reservation-status';
import { ReservationGuestRefDto, ReservationListItemDto } from './reservation-list-item.dto';

const NOTES = { type: String, nullable: true, maxLength: 2000 } as const;
const GUEST_DATA_FIELDS = ['firstName', 'lastName', 'email', 'phone'] as const;

/** `id` wyklucza pozostałe pola gościa (istniejący gość **albo** dane nowego, Q-03). */
function ExcludesGuestData(): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'excludesGuestData',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: 'guest.id cannot be combined with firstName, lastName, email or phone' },
      validator: {
        validate: (_: unknown, args) =>
          GUEST_DATA_FIELDS.every(
            (field) => (args?.object as Record<string, unknown>)[field] === undefined,
          ),
      },
    });
}

const isNewGuest = (dto: ReservationGuestInputDto): boolean => dto.id === undefined;

/** Istniejący gość obiektu (`{ id }`) albo dane gościa do upsertu (docs/features/guests.md). */
export class ReservationGuestInputDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Istniejący gość tego obiektu' })
  @ValidateIf((dto: ReservationGuestInputDto) => !isNewGuest(dto))
  @IsUUID()
  @ExcludesGuestData()
  id?: string;

  @ApiPropertyOptional({ example: 'Anna', maxLength: 100, description: 'Wymagane bez `id`' })
  @ValidateIf(isNewGuest)
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kowalska', maxLength: 100, description: 'Wymagane bez `id`' })
  @ValidateIf(isNewGuest)
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'anna.kowalska@example.com',
    description:
      'Opcjonalny przy rezerwacji ręcznej (Q-03); istniejący gość z tym e-mailem jest aktualizowany (Q-04)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '+48 600 100 200', maxLength: 30 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(3, 30)
  phone?: string | null;
}

export class CreateManualReservationDto {
  @ApiProperty({ format: 'uuid', description: 'Pokój tego obiektu (inaczej 404)' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ format: 'date', example: '2026-08-14' })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-08-18', description: 'Dzień wyjazdu (`[)`)' })
  @IsCalendarDate()
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: 99, example: 2 })
  @IsInt()
  @Min(1)
  @Max(99)
  guestsCount: number;

  @ApiProperty({ type: ReservationGuestInputDto })
  @ValidateNested()
  @Type(() => ReservationGuestInputDto)
  guest: ReservationGuestInputDto;

  @ApiPropertyOptional(NOTES)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  guestNotes?: string | null;

  @ApiPropertyOptional({ ...NOTES, description: 'Widoczna tylko w panelu' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  internalNotes?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Pomija minimalny pobyt BR-03 (Q-01)' })
  @IsOptional()
  @IsBoolean()
  ignoreMinNights?: boolean;
}

/** Q-02, BR-11: `version` wymagane; reszta opcjonalna. */
export class UpdateReservationDto {
  @ApiProperty({ minimum: 1, example: 3, description: 'Wersja z ostatniego odczytu (BR-11)' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ ...NOTES, description: 'Można zmieniać w każdym statusie' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  internalNotes?: string | null;

  @ApiPropertyOptional(NOTES)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  guestNotes?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  guestsCount?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'Inny pokój tego obiektu' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsCalendarDate()
  checkIn?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsCalendarDate()
  checkOut?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Tylko rezerwacja MANUAL: pomija BR-03 przy zmianie terminu (Q-01)',
  })
  @IsOptional()
  @IsBoolean()
  ignoreMinNights?: boolean;
}

export class CancelReservationDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500, example: 'Prośba gościa' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

const splitList = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((item) => item.trim()) : value,
  );

export class ListReservationsQuery extends IntersectionType(
  PaginationQuery,
  SortQuery(['checkIn', 'createdAt', 'number', 'totalPrice'], 'checkIn:asc'),
) {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    description: `Statusy po przecinku: ${RESERVATION_STATUSES.join(', ')}`,
    example: 'PENDING,CONFIRMED',
    type: String,
  })
  @IsOptional()
  @splitList()
  @IsIn(RESERVATION_STATUSES, { each: true })
  status?: (typeof RESERVATION_STATUSES)[number][];

  @ApiPropertyOptional({ enum: RESERVATION_SOURCES, enumName: 'ReservationSource' })
  @IsOptional()
  @IsIn(RESERVATION_SOURCES)
  source?: (typeof RESERVATION_SOURCES)[number];

  @ApiPropertyOptional({ format: 'date', description: 'Pobyt ma noc w `[from, to]`' })
  @IsOptional()
  @IsCalendarDate()
  from?: string;

  @ApiPropertyOptional({ format: 'date', description: '≥ from' })
  @IsOptional()
  @IsCalendarDate()
  @IsRangeEnd('from', Number.MAX_SAFE_INTEGER)
  to?: string;

  @ApiPropertyOptional({
    description: 'Szukaj po nazwisku lub e-mailu gościa albo numerze (min. 2 znaki)',
    example: 'kowalska',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  q?: string;
}

export class ReservationPageDto extends Paginated(ReservationListItemDto) {}

export class ReservationGuestDto extends ReservationGuestRefDto {
  @ApiProperty({ type: String, nullable: true, example: '+48 600 100 200' })
  phone: string | null;
}

export class NightPriceRecordDto {
  @ApiProperty({ format: 'date', example: '2026-08-14' })
  date: string;

  @ApiProperty({ description: 'Grosze', example: 37000 })
  price: number;
}

const ACTOR_TYPES = ['GUEST', 'OWNER', 'ADMIN', 'SYSTEM'] as const;

export class ReservationEventDto {
  @ApiProperty({ enum: ['CREATED', 'UPDATED', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED'] })
  type: ReservationDetail['events'][number]['type'];

  @ApiProperty({ enum: ACTOR_TYPES, enumName: 'ActorType' })
  actorType: (typeof ACTOR_TYPES)[number];

  @ApiProperty({ type: String, nullable: true, example: 'Jan Nowak', description: 'OWNER/ADMIN' })
  actorName: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Np. `{ fields: [...] }` dla UPDATED, `{ reason }` dla CANCELLED',
  })
  payload: unknown;
}

/** Szczegóły rezerwacji (docs/features/reservations.md: `ReservationDto`). */
export class ReservationDto extends OmitType(ReservationListItemDto, ['guest'] as const) {
  @ApiProperty({ type: ReservationGuestDto })
  guest: ReservationGuestDto;

  @ApiProperty({ type: [NightPriceRecordDto], description: 'Zamrożone ceny nocy (BR-05)' })
  priceBreakdown: NightPriceRecordDto[];

  @ApiProperty({ type: String, nullable: true })
  guestNotes: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Widoczna tylko w panelu' })
  internalNotes: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ enum: ACTOR_TYPES, enumName: 'ActorType', nullable: true })
  cancelledBy: (typeof ACTOR_TYPES)[number] | null;

  @ApiProperty({ type: String, nullable: true })
  cancellationReason: string | null;

  @ApiProperty({ example: 1, description: 'Do `PATCH` (BR-11)' })
  version: number;

  @ApiProperty({ type: [ReservationEventDto], description: 'Historia (Q-05), od najstarszych' })
  events: ReservationEventDto[];

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export function toReservationDto(detail: ReservationDetail): ReservationDto {
  return {
    id: detail.id,
    number: detail.number,
    propertyId: detail.propertyId,
    room: detail.room,
    guest: detail.guest,
    checkIn: detail.checkIn,
    checkOut: detail.checkOut,
    nights: detail.nights,
    guestsCount: detail.guestsCount,
    totalPrice: detail.totalPrice,
    currency: detail.currency,
    status: detail.status,
    source: detail.source,
    expiresAt: detail.expiresAt,
    createdAt: detail.createdAt,
    priceBreakdown: detail.priceBreakdown,
    guestNotes: detail.guestNotes,
    internalNotes: detail.internalNotes,
    confirmedAt: detail.confirmedAt,
    cancelledAt: detail.cancelledAt,
    cancelledBy: detail.cancelledBy,
    cancellationReason: detail.cancellationReason,
    version: detail.version,
    events: detail.events,
    updatedAt: detail.updatedAt,
  };
}
