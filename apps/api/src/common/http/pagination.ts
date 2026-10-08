import type { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** `?page=1&pageSize=20` (docs/architecture/api-conventions.md#paginacja). Wartość spoza zakresu → 400. */
export class PaginationQuery {
  @ApiPropertyOptional({ description: 'Numer strony (od 1)', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @TransformType(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Liczba elementów na stronie',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    example: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @TransformType(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 134 })
  totalItems: number;

  @ApiProperty({ example: 7 })
  totalPages: number;
}

/** Wynik listy z paginacją: `{ data, meta }`. Zwracany przez serwisy i mapowany na DTO. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMetaDto;
}

/**
 * Generyczny DTO odpowiedzi dla Swaggera. Użycie daje nazwany schemat w OpenAPI (i typ w orval):
 * `export class ReservationPageDto extends Paginated(ReservationListItemDto) {}`.
 */
export function Paginated<TItem>(itemType: Type<TItem>): Type<Paginated<TItem>> {
  class PaginatedResponseDto implements Paginated<TItem> {
    @ApiProperty({ type: [itemType] })
    data: TItem[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
  }
  return PaginatedResponseDto;
}

/** `skip` i `take` dla zapytania o stronę. */
export function toSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function paginate<T>(data: T[], query: PaginationQuery, totalItems: number): Paginated<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    },
  };
}
