import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

import { Paginated, PaginationQuery } from '../../../common/http/pagination';
import { Trim } from '../../../common/http/query-transforms';
import { SortQuery } from '../../../common/http/sort';

export class ListGuestsQuery extends IntersectionType(
  PaginationQuery,
  SortQuery(['lastName', 'createdAt', 'lastStayAt'], 'lastName:asc'),
) {
  @ApiPropertyOptional({
    description: 'Szukaj w imieniu, nazwisku, e-mailu i telefonie (min. 2 znaki)',
    example: 'kowal',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  q?: string;
}

export class GuestListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Anna' })
  firstName: string;

  @ApiProperty({ example: 'Kowalska' })
  lastName: string;

  @ApiProperty({ type: String, nullable: true, example: 'anna.kowalska@example.com' })
  email: string | null;

  @ApiProperty({ type: String, nullable: true, example: '+48 600 100 200' })
  phone: string | null;

  @ApiProperty({ example: 3, description: 'Wszystkie rezerwacje gościa w obiekcie' })
  reservationsCount: number;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-08-14',
    description: 'Najpóźniejszy przyjazd rezerwacji CONFIRMED/COMPLETED',
  })
  lastStayAt: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class GuestPageDto extends Paginated(GuestListItemDto) {}
