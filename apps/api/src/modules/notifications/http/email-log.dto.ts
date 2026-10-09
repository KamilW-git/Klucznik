import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import { IsCalendarDate, IsRangeEnd } from '../../../common/http/date-fields';
import { Paginated, PaginationQuery } from '../../../common/http/pagination';
import { Trim } from '../../../common/http/query-transforms';
import { EMAIL_TEMPLATES } from '../domain/email-plan';

const EMAIL_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const;

export class ListEmailLogsQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: EMAIL_STATUSES, enumName: 'EmailStatus' })
  @IsOptional()
  @IsIn(EMAIL_STATUSES)
  status?: (typeof EMAIL_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Fragment adresu odbiorcy (min. 2 znaki)',
    example: 'kowalska',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  q?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Dzień `createdAt` od (Europe/Warsaw)' })
  @IsOptional()
  @IsCalendarDate()
  from?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Dzień `createdAt` do, włącznie; ≥ from' })
  @IsOptional()
  @IsCalendarDate()
  @IsRangeEnd('from', Number.MAX_SAFE_INTEGER)
  to?: string;
}

export class EmailLogDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'anna.kowalska@example.com' })
  recipient: string;

  @ApiProperty({ enum: EMAIL_TEMPLATES, example: 'reservation-received' })
  template: string;

  @ApiProperty({ enum: EMAIL_STATUSES, enumName: 'EmailStatus' })
  status: (typeof EMAIL_STATUSES)[number];

  @ApiProperty({ example: 1 })
  attempts: number;

  @ApiProperty({ type: String, nullable: true })
  lastError: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sentAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, nullable: true, example: 'KL-2026-000123' })
  reservationNumber: string | null;
}

export class EmailLogPageDto extends Paginated(EmailLogDto) {}
