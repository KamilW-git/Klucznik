import type { Type } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export type SortDirection = 'asc' | 'desc';

export interface SortSpec<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export interface SortQueryShape {
  sort: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wyrażenie `field:dir[,field:dir…]` ograniczone do białej listy pól. */
export function sortPattern(allowedFields: readonly string[]): RegExp {
  const fields = allowedFields.map(escapeRegExp).join('|');
  const item = `(?:${fields}):(?:asc|desc)`;
  return new RegExp(`^${item}(?:,${item})*$`);
}

/**
 * DTO parametru `?sort=checkIn:asc,number:desc` z białą listą pól
 * (docs/architecture/api-conventions.md#sortowanie). Nieznane pole lub kierunek → 400.
 * Łączenie z paginacją: `IntersectionType(PaginationQuery, SortQuery(['checkIn'], 'checkIn:asc'))`.
 */
export function SortQuery(
  allowedFields: readonly string[],
  defaultSort: string,
): Type<SortQueryShape> {
  const pattern = sortPattern(allowedFields);
  if (!pattern.test(defaultSort)) {
    throw new Error(
      `Default sort "${defaultSort}" is not allowed by [${allowedFields.join(', ')}]`,
    );
  }

  class SortQueryDto implements SortQueryShape {
    @ApiPropertyOptional({
      description: `Sortowanie \`pole:asc|desc\`, wiele po przecinku. Dozwolone pola: ${allowedFields.join(', ')}.`,
      default: defaultSort,
      example: defaultSort,
    })
    @IsOptional()
    @IsString()
    @Matches(pattern, {
      message: `sort must be "field:asc|desc" (comma separated), allowed fields: ${allowedFields.join(', ')}`,
    })
    sort: string = defaultSort;
  }
  return SortQueryDto;
}

/**
 * Parsuje zwalidowany parametr `sort` na listę `{ field, direction }`.
 * Powtórzone pole: liczy się pierwsze wystąpienie.
 */
export function parseSort<TField extends string>(value: string): SortSpec<TField>[] {
  const seen = new Set<string>();
  const specs: SortSpec<TField>[] = [];
  for (const part of value.split(',')) {
    const [field, direction] = part.split(':') as [TField, SortDirection];
    if (!seen.has(field)) {
      seen.add(field);
      specs.push({ field, direction });
    }
  }
  return specs;
}
