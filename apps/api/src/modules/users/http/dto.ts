import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Paginated, PaginationQuery } from '../../../common/http/pagination';
import { ToBoolean, Trim } from '../../../common/http/query-transforms';
import { SortQuery } from '../../../common/http/sort';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../../properties/domain/slug';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// --- Zapytania ---------------------------------------------------------------

export class ListOwnersQuery extends IntersectionType(
  PaginationQuery,
  SortQuery(['createdAt', 'lastName'], 'createdAt:desc'),
) {
  @ApiPropertyOptional({
    description: 'Szukaj w imieniu, nazwisku i e-mailu (min. 2 znaki)',
    example: 'nowak',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  q?: string;

  @ApiPropertyOptional({ description: 'Filtr: aktywne (`true`) lub zablokowane (`false`)' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}

// --- Wejście -----------------------------------------------------------------

export class CreateOwnerPropertyDto {
  @ApiProperty({
    description: 'Nazwa obiektu',
    example: 'Domki Leśna Polana',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({
    description: 'Adres strony `/o/:slug`. Bez niego generowany z nazwy (z sufiksem przy kolizji).',
    example: 'lesna-polana',
    minLength: SLUG_MIN_LENGTH,
    maxLength: SLUG_MAX_LENGTH,
    pattern: SLUG_PATTERN.source,
  })
  @IsOptional()
  @IsString()
  @Length(SLUG_MIN_LENGTH, SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug may contain only a-z, 0-9 and single dashes' })
  slug?: string;
}

export class CreateOwnerDto {
  @ApiProperty({ example: 'Jan', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Nowak', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ example: 'jan.nowak@example.com', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    description: 'Hasło tymczasowe (admin przekazuje je właścicielowi poza systemem)',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @Length(10, 200)
  password: string;

  @ApiPropertyOptional({
    type: CreateOwnerPropertyDto,
    description: 'Obiekt zakładany od razu (Q-07)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOwnerPropertyDto)
  property?: CreateOwnerPropertyDto;
}

export class UpdateOwnerDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'Nowe hasło tymczasowe', minLength: 10, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(10, 200)
  password?: string;

  @ApiPropertyOptional({ description: '`false` blokuje konto i unieważnia wszystkie sesje (Q-10)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// --- Wyjście -----------------------------------------------------------------

export class OwnerListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Jan' })
  firstName: string;

  @ApiProperty({ example: 'Nowak' })
  lastName: string;

  @ApiProperty({ example: 'jan.nowak@example.com' })
  email: string;

  @ApiProperty({ description: '`false` = konto zablokowane' })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  propertiesCount: number;

  @ApiProperty({ description: 'Rezerwacje utworzone w ostatnich 30 dniach', example: 12 })
  reservationsLast30Days: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class OwnerPropertyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domki Leśna Polana' })
  name: string;

  @ApiProperty({ example: 'lesna-polana' })
  slug: string;

  @ApiProperty()
  isActive: boolean;
}

export class OwnerDto extends OwnerListItemDto {
  @ApiProperty({ type: [OwnerPropertyDto] })
  properties: OwnerPropertyDto[];
}

export class OwnerPageDto extends Paginated(OwnerListItemDto) {}
