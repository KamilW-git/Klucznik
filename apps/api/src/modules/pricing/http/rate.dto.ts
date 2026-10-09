import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import type { RateView } from '../application/rates.service';

/** Najdłuższa stawka: rok przestępny (docs/features/pricing.md). */
export const MAX_RATE_NIGHTS = 366;

const DATE_FROM_DOC = { format: 'date', example: '2026-07-01', description: 'Pierwsza noc stawki' };
const DATE_TO_DOC = {
  format: 'date',
  example: '2026-08-31',
  description: `Ostatnia noc objęta stawką (włącznie), ≥ dateFrom, zakres ≤ ${MAX_RATE_NIGHTS} nocy`,
};
const MIN_NIGHTS_DOC = {
  type: Number,
  nullable: true,
  minimum: 1,
  maximum: 30,
  description: 'Minimalny pobyt z nocą przyjazdu w tej stawce; `null` = `Room.minNights` (BR-03)',
};

export class CreateSeasonalRateDto {
  @ApiProperty({ example: 'Wysoki sezon', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  name: string;

  @ApiProperty(DATE_FROM_DOC)
  @IsCalendarDate()
  dateFrom: string;

  @ApiProperty(DATE_TO_DOC)
  @IsCalendarDate()
  @IsRangeEnd('dateFrom', MAX_RATE_NIGHTS)
  dateTo: string;

  @ApiProperty({ description: 'Grosze (BR-05)', minimum: 0, maximum: 10_000_000, example: 45000 })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  pricePerNight: number;

  @ApiPropertyOptional(MIN_NIGHTS_DOC)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(30)
  minNights?: number | null;
}

const changesDates = (dto: UpdateSeasonalRateDto): boolean =>
  dto.dateFrom !== undefined || dto.dateTo !== undefined;

/** Wszystkie pola opcjonalne; `dateFrom` i `dateTo` zmienia się razem. */
export class UpdateSeasonalRateDto {
  @ApiPropertyOptional({ example: 'Wysoki sezon', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ ...DATE_FROM_DOC, description: 'Razem z `dateTo`' })
  @ValidateIf(changesDates)
  @IsDefined({ message: 'dateFrom and dateTo must be sent together' })
  @IsCalendarDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    ...DATE_TO_DOC,
    description: `${DATE_TO_DOC.description}; razem z \`dateFrom\``,
  })
  @ValidateIf(changesDates)
  @IsDefined({ message: 'dateFrom and dateTo must be sent together' })
  @IsCalendarDate()
  @IsRangeEnd('dateFrom', MAX_RATE_NIGHTS)
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Grosze (BR-05)', minimum: 0, maximum: 10_000_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  pricePerNight?: number;

  @ApiPropertyOptional(MIN_NIGHTS_DOC)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(30)
  minNights?: number | null;
}

export class SeasonalRateDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ example: 'Wysoki sezon' })
  name: string;

  @ApiProperty({ format: 'date', example: '2026-07-01' })
  dateFrom: string;

  @ApiProperty({ format: 'date', example: '2026-08-31', description: 'Ostatnia noc (włącznie)' })
  dateTo: string;

  @ApiProperty({ description: 'Grosze', example: 45000 })
  pricePerNight: number;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  minNights: number | null;

  @ApiProperty({ example: 'PLN' })
  currency: string;
}

export class SeasonalRateListDto {
  @ApiProperty({ type: [SeasonalRateDto] })
  data: SeasonalRateDto[];
}

export function toSeasonalRateDto(rate: RateView): SeasonalRateDto {
  return {
    id: rate.id,
    roomId: rate.roomId,
    name: rate.name,
    dateFrom: rate.nights.from.toString(),
    dateTo: rate.nights.to.toString(),
    pricePerNight: rate.pricePerNight,
    minNights: rate.minNights,
    currency: rate.currency,
  };
}
