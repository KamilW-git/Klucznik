import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, registerDecorator, type ValidationOptions } from 'class-validator';

import { CalendarDate } from '../domain/calendar-date';

/** Data kalendarzowa `YYYY-MM-DD`, która istnieje (2026-02-30 → 400), ADR 0007. */
export function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName: propertyName as string,
      options: {
        message: ({ property }) => `${property} must be a valid date in YYYY-MM-DD format`,
        ...options,
      },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && CalendarDate.isValid(value),
      },
    });
}

/**
 * Koniec zakresu dni **włącznie**: nie wcześniej niż pole `startProperty` i najwyżej `maxDays` dni
 * łącznie z oboma końcami. Gdy któraś data jest niepoprawna, błąd zgłasza już `IsCalendarDate`.
 */
export function IsRangeEnd(
  startProperty: string,
  maxDays: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isRangeEnd',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [startProperty, maxDays],
      options: {
        message: ({ property }) =>
          `${property} must not be before ${startProperty} and the range may cover at most ${maxDays} days`,
        ...options,
      },
      validator: {
        validate: (value: unknown, args) => {
          const start = (args?.object as Record<string, unknown> | undefined)?.[startProperty];
          if (
            typeof value !== 'string' ||
            typeof start !== 'string' ||
            !CalendarDate.isValid(value) ||
            !CalendarDate.isValid(start)
          ) {
            return true;
          }
          const days = CalendarDate.parse(value).diffDays(CalendarDate.parse(start)) + 1;
          return days >= 1 && days <= maxDays;
        },
      },
    });
}

/** Filtr list stawek i blokad: elementy przecinające `[from, to]` (oba opcjonalne). */
export class DateRangeQuery {
  @ApiPropertyOptional({ format: 'date', example: '2026-07-01' })
  @IsOptional()
  @IsCalendarDate()
  from?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-12-31', description: '≥ from' })
  @IsOptional()
  @IsCalendarDate()
  @IsRangeEnd('from', Number.MAX_SAFE_INTEGER)
  to?: string;
}

/** `DateRangeQuery` po walidacji → daty domeny. */
export function toDateRangeFilter(query: DateRangeQuery): {
  from?: CalendarDate;
  to?: CalendarDate;
} {
  return {
    from: query.from === undefined ? undefined : CalendarDate.parse(query.from),
    to: query.to === undefined ? undefined : CalendarDate.parse(query.to),
  };
}
