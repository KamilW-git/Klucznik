import type { SeasonalRateDto } from '@klucznik/api-client';
import { differenceInCalendarDays, endOfYear, format, max, min, startOfYear } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { formatDate, parseApiDate } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { Tooltip } from '@/shared/ui/tooltip';

import { seasonColor } from '../season-colors';

interface SeasonTimelineProps {
  rates: readonly SeasonalRateDto[];
  year: number;
  onYearChange: (year: number) => void;
}

/** Pasek roku z sezonami w kolorach (wizualizacja zakresów stawek, pricing.md). */
export function SeasonTimeline({ rates, year, onYearChange }: SeasonTimelineProps) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(yearStart);
  const totalDays = differenceInCalendarDays(yearEnd, yearStart) + 1;
  const months = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-overline text-muted-foreground uppercase">Oś stawek w roku {year}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Poprzedni rok"
            onClick={() => onYearChange(year - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Następny rok"
            onClick={() => onYearChange(year + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="relative h-10 overflow-hidden rounded-md border bg-background">
        {rates.map((rate, index) => {
          const from = max([parseApiDate(rate.dateFrom), yearStart]);
          const to = min([parseApiDate(rate.dateTo), yearEnd]);
          if (from > to) return null;
          const left = (differenceInCalendarDays(from, yearStart) / totalDays) * 100;
          const width = ((differenceInCalendarDays(to, from) + 1) / totalDays) * 100;
          const label = `${rate.name}: ${formatDate(rate.dateFrom)} – ${formatDate(rate.dateTo)}, ${formatMoney(rate.pricePerNight, rate.currency)} / noc`;
          return (
            <Tooltip key={rate.id} content={label}>
              <span
                role="img"
                aria-label={label}
                className={`absolute inset-y-1 flex items-center overflow-hidden rounded-sm px-1 text-[0.6875rem] font-semibold whitespace-nowrap ${seasonColor(index)}`}
                style={{ left: `${left}%`, width: `max(${width}%, 4px)` }}
              >
                <span className="truncate">{rate.name}</span>
              </span>
            </Tooltip>
          );
        })}
      </div>
      <div
        className="grid grid-cols-12 text-center text-xs text-muted-foreground"
        aria-hidden="true"
      >
        {months.map((month) => (
          <span key={month.getMonth()} className="capitalize">
            {format(month, 'LLL', { locale: pl })}
          </span>
        ))}
      </div>
    </div>
  );
}
