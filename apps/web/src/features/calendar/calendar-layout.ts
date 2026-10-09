import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { parseApiDate, toApiDate, WEEK_STARTS_ON } from '@/shared/lib/dates';

export type CalendarView = '2w' | 'month';

export interface CalendarWindow {
  /** Pierwszy i ostatni dzień widoku (włącznie, `YYYY-MM-DD`). */
  from: string;
  to: string;
  days: Date[];
}

/** Okno widoku: miesiąc kalendarzowy albo 2 tygodnie od poniedziałku. */
export function calendarWindow(anchor: Date, view: CalendarView): CalendarWindow {
  const start =
    view === 'month' ? startOfMonth(anchor) : startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  const end = view === 'month' ? endOfMonth(anchor) : addDays(start, 13);
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return { from: toApiDate(start), to: toApiDate(end), days };
}

/** Kotwica poprzedniego / następnego okna. */
export function shiftAnchor(anchor: Date, view: CalendarView, direction: -1 | 1): Date {
  return view === 'month' ? addMonths(anchor, direction) : addWeeks(anchor, 2 * direction);
}

/**
 * Kolumny paska w siatce pół-dni (każdy dzień = 2 kolumny, numeracja od 1):
 * pobyt `[checkIn, checkOut)` zaczyna się w drugiej połowie dnia przyjazdu i kończy w pierwszej
 * połowie dnia wyjazdu („połowa dnia na styku”). Blokada (noce włącznie) – tak samo z wyjazdem
 * dzień po ostatniej nocy. `null`, gdy zakres jest poza oknem.
 */
export function barColumns(
  checkIn: string,
  checkOut: string,
  window: Pick<CalendarWindow, 'from' | 'days'>,
): { start: number; end: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const origin = parseApiDate(window.from);
  const dayCount = window.days.length;
  const startDay = differenceInCalendarDays(parseApiDate(checkIn), origin);
  const endDay = differenceInCalendarDays(parseApiDate(checkOut), origin);
  // Wyjazd w pierwszym dniu okna: widoczna jeszcze poranna połowa tego dnia.
  if (endDay < 0 || startDay >= dayCount) return null;
  const clippedStart = startDay < 0;
  const clippedEnd = endDay > dayCount - 1;
  return {
    start: clippedStart ? 1 : startDay * 2 + 2,
    end: clippedEnd ? dayCount * 2 + 1 : endDay * 2 + 2,
    clippedStart,
    clippedEnd,
  };
}

/** Dzień wyjazdu blokady (dzień po ostatniej nocy) – do wspólnego rysowania z rezerwacjami. */
export function blockCheckout(dateTo: string): string {
  return toApiDate(addDays(parseApiDate(dateTo), 1));
}

/** „Sierpień 2026” albo „14.08 – 27.08.2026”. */
export function windowLabel(window: CalendarWindow, view: CalendarView, monthName: string): string {
  if (view === 'month') return `${monthName} ${format(parseApiDate(window.from), 'yyyy')}`;
  return `${format(parseApiDate(window.from), 'dd.MM')} – ${format(parseApiDate(window.to), 'dd.MM.yyyy')}`;
}
