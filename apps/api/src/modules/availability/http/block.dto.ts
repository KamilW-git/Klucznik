import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import type { AvailabilityBlock } from '../application/ports';

export const MAX_BLOCK_NIGHTS = 366;

export class CreateBlockDto {
  @ApiProperty({ format: 'date', example: '2026-08-20', description: 'Pierwsza zablokowana noc' })
  @IsCalendarDate()
  dateFrom: string;

  @ApiProperty({
    format: 'date',
    example: '2026-08-22',
    description: `Ostatnia zablokowana noc (włącznie), ≥ dateFrom, zakres ≤ ${MAX_BLOCK_NIGHTS} nocy`,
  })
  @IsCalendarDate()
  @IsRangeEnd('dateFrom', MAX_BLOCK_NIGHTS)
  dateTo: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200, example: 'Remont' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  reason?: string | null;
}

export class AvailabilityBlockDto {
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

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class AvailabilityBlockListDto {
  @ApiProperty({ type: [AvailabilityBlockDto] })
  data: AvailabilityBlockDto[];
}

export function toAvailabilityBlockDto(block: AvailabilityBlock): AvailabilityBlockDto {
  return {
    id: block.id,
    roomId: block.roomId,
    dateFrom: block.nights.from.toString(),
    dateTo: block.nights.to.toString(),
    reason: block.reason,
    createdAt: block.createdAt,
  };
}
