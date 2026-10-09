import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentProps } from 'react';
import { DayPicker } from 'react-day-picker';
import { pl } from 'react-day-picker/locale';

import { cn } from '@/shared/lib/cn';

export type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Kalendarz (react-day-picker) po polsku, tydzień od poniedziałku. Dni wyłączone (np. zajęte)
 * są przekreślone i szare, zakres zaznaczony kolorem `primary`.
 */
export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={pl}
      weekStartsOn={1}
      showOutsideDays
      className={cn('w-fit', className)}
      classNames={{
        months: 'relative flex flex-col gap-6 sm:flex-row',
        month: 'grid gap-3',
        month_caption: 'flex h-11 items-center justify-center px-12',
        caption_label: 'text-base font-semibold capitalize',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'flex size-11 items-center justify-center rounded-md text-primary hover:bg-accent disabled:opacity-40',
        button_next:
          'flex size-11 items-center justify-center rounded-md text-primary hover:bg-accent disabled:opacity-40',
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'w-11 text-center text-xs font-semibold text-muted-foreground uppercase',
        week: 'mt-1 flex',
        day: 'group relative size-11 p-0 text-center',
        day_button:
          'flex size-11 items-center justify-center rounded-md text-base tabular hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed',
        today: 'font-bold text-primary [&>button]:ring-1 [&>button]:ring-primary/40',
        outside: 'text-muted-foreground/50',
        disabled:
          '[&>button]:bg-status-expired [&>button]:text-muted-foreground [&>button]:line-through [&>button]:hover:bg-status-expired',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover',
        range_middle:
          '[&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:hover:bg-accent',
        range_start: '[&>button]:rounded-r-none',
        range_end: '[&>button]:rounded-l-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-5" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-5" aria-hidden="true" />
          ),
      }}
      {...props}
    />
  );
}
