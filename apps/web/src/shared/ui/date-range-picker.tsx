import { eachDayOfInterval, isBefore, startOfDay, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/shared/lib/cn';
import {
  formatDate,
  formatNights,
  nightsBetween,
  parseApiDate,
  toApiDate,
} from '@/shared/lib/dates';

import { Calendar } from './calendar';
import { useFieldControlProps } from './form-field-context';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/** Zakres w formacie API (`YYYY-MM-DD`). */
export interface DateRangeValue {
  from: string;
  to: string;
}

type RangeMode = 'stay' | 'nights';

interface DateRangePickerProps {
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
  /**
   * `stay`: pobyt `[checkIn, checkOut)`, `to` to dzień wyjazdu (min. 1 noc).
   * `nights`: noce włącznie (stawki, blokady), `to` to ostatnia noc (może być równe `from`).
   */
  mode?: RangeMode;
  /** Noc niedostępna (np. zajęta przez inną rezerwację). Zakres nie może jej obejmować. */
  isNightUnavailable?: (night: Date) => boolean;
  /** Najwcześniejszy dzień do wyboru. */
  fromDate?: Date;
  placeholder?: string;
  numberOfMonths?: number;
  className?: string;
  'aria-label'?: string;
  /** Miesiąc pokazany po otwarciu, gdy brak wartości. */
  defaultMonth?: Date;
  /** Zmiana widocznego miesiąca (np. do pobrania zajętości pokoju). */
  onMonthChange?: (month: Date) => void;
  /** Kalendarz na stronie (np. w dialogu „Zobacz terminy”) zamiast przycisku z popoverem. */
  inline?: boolean;
}

/** Wybór zakresu dat w popoverze albo na stronie (PL, tydzień od poniedziałku). */
export function DateRangePicker({
  value,
  onChange,
  mode = 'stay',
  isNightUnavailable,
  fromDate,
  placeholder = 'Wybierz daty',
  numberOfMonths = 2,
  className,
  'aria-label': ariaLabel,
  defaultMonth,
  onMonthChange,
  inline = false,
}: DateRangePickerProps) {
  const field = useFieldControlProps();
  const [open, setOpen] = useState(false);
  // Pierwszy wskazany dzień; wartość jest zatwierdzana dopiero po wskazaniu końca.
  const [start, setStart] = useState<Date | null>(null);

  const committed: DateRange | undefined = value
    ? { from: parseApiDate(value.from), to: parseApiDate(value.to) }
    : undefined;

  const label = value
    ? mode === 'stay'
      ? `${formatDate(value.from)} – ${formatDate(value.to)} (${formatNights(nightsBetween(value.from, value.to))})`
      : `${formatDate(value.from)} – ${formatDate(value.to)}`
    : placeholder;

  const taken = (day: Date) => isNightUnavailable?.(day) ?? false;

  function isDayDisabled(day: Date): boolean {
    if (fromDate && isBefore(day, startOfDay(fromDate))) return true;
    if (!taken(day)) return false;
    // Pobyt: zajęta noc może być dniem wyjazdu, jeśli zakres od przyjazdu jest wolny.
    return !(mode === 'stay' && start && day > start && rangeIsFree(start, day, mode, taken));
  }

  function handleDay(day: Date) {
    if (!start) {
      setStart(day);
      return;
    }
    const [from, to] = start <= day ? [start, day] : [day, start];
    const sameDay = from.getTime() === to.getTime();
    if ((mode === 'stay' && sameDay) || !rangeIsFree(from, to, mode, taken)) {
      setStart(day);
      return;
    }
    setStart(null);
    onChange({ from: toApiDate(from), to: toApiDate(to) });
    setOpen(false);
  }

  const picker = (
    <>
      <Calendar
        mode="range"
        numberOfMonths={numberOfMonths}
        defaultMonth={committed?.from ?? defaultMonth ?? fromDate}
        onMonthChange={onMonthChange}
        selected={start ? { from: start, to: undefined } : committed}
        disabled={isDayDisabled}
        onSelect={(_range, day) => handleDay(day)}
      />
      <p className="mt-2 max-w-72 text-sm text-muted-foreground" aria-live="polite">
        {mode === 'stay'
          ? start
            ? 'Wybierz dzień wyjazdu.'
            : inline && value
              ? `Wybrano: ${label}. Kliknij dzień, aby wybrać inny przyjazd.`
              : 'Wybierz dzień przyjazdu.'
          : start
            ? 'Wybierz ostatnią noc (ten sam dzień = jedna noc).'
            : 'Wybierz pierwszą noc.'}
      </p>
    </>
  );

  if (inline) {
    return (
      <div role="group" aria-label={ariaLabel} className={cn('grid justify-center', className)}>
        {picker}
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setStart(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          {...field}
          aria-label={ariaLabel}
          className={cn(
            'flex h-12 w-full min-w-0 items-center gap-3 rounded-md border border-input bg-card px-4 text-left text-base tabular focus-visible:border-2 focus-visible:border-primary focus-visible:px-[15px] focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none aria-invalid:border-destructive',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">{picker}</PopoverContent>
    </Popover>
  );
}

/** Czy noce zakresu są wolne: pobyt `[from, to)`, noce włącznie `[from, to]`. */
function rangeIsFree(
  from: Date,
  to: Date,
  mode: RangeMode,
  taken: (day: Date) => boolean,
): boolean {
  const lastNight = mode === 'stay' ? subDays(to, 1) : to;
  if (lastNight < from) return true;
  return !eachDayOfInterval({ start: from, end: lastNight }).some(taken);
}
