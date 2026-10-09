import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

/** Lokalizacja date-fns dla całej aplikacji (tydzień od poniedziałku). */
export const dateLocale = pl;
export const WEEK_STARTS_ON = 1;

/** Data z API (`YYYY-MM-DD` albo ISO) jako lokalna data kalendarzowa (bez przesunięcia strefy). */
export function parseApiDate(value: string): Date {
  return parseISO(value.length === 10 ? `${value}T00:00:00` : value);
}

/** `Date` → `YYYY-MM-DD` dla API. */
export function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** „14.08.2026”. */
export function formatDate(value: string | Date): string {
  return format(typeof value === 'string' ? parseApiDate(value) : value, 'dd.MM.yyyy');
}

/** „15:00” (z ISO albo z gotowego `HH:mm`). */
export function formatTime(value: string | Date): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  return format(typeof value === 'string' ? parseISO(value) : value, 'HH:mm');
}

/** „14.08.2026, 15:00”. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return `${format(date, 'dd.MM.yyyy')}, ${format(date, 'HH:mm')}`;
}

/** „poniedziałek, 16 czerwca 2025”. */
export function formatLongDate(value: string | Date): string {
  return format(typeof value === 'string' ? parseApiDate(value) : value, 'EEEE, d MMMM yyyy', {
    locale: pl,
  });
}

/** Liczba nocy w zakresie półotwartym `[checkIn, checkOut)`. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseApiDate(checkOut), parseApiDate(checkIn));
}

/** Odmiana polska: 1 noc, 2–4 noce, 5+ nocy (12–14 nocy, 22–24 noce). */
export function pluralize(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

/** „4 noce”. */
export function formatNights(count: number): string {
  return `${count} ${pluralize(count, 'noc', 'noce', 'nocy')}`;
}

/** „14.08 – 18.08.2026 (4 noce)”; rok przy dacie przyjazdu tylko, gdy różni się od roku wyjazdu. */
export function formatStayRange(checkIn: string, checkOut: string): string {
  const from = parseApiDate(checkIn);
  const to = parseApiDate(checkOut);
  const fromPattern = from.getFullYear() === to.getFullYear() ? 'dd.MM' : 'dd.MM.yyyy';
  return `${format(from, fromPattern)} – ${format(to, 'dd.MM.yyyy')} (${formatNights(nightsBetween(checkIn, checkOut))})`;
}
