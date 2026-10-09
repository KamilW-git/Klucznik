import type { CalendarDate } from './calendar-date';

/** Przesunięcie strefy względem UTC (ms) w danej chwili. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instantMs);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Chwila początku dnia `date` w strefie `timeZone` (np. 2026-08-01 w Warszawie → 2026-07-31T22:00Z).
 * Filtry „od–do” po znacznikach czasu (`createdAt`) liczone według dni w strefie aplikacji.
 */
export function startOfDayInZone(date: CalendarDate, timeZone: string): Date {
  const [year, month, day] = date.toString().split('-').map(Number) as [number, number, number];
  const midnightUtc = Date.UTC(year, month - 1, day);
  // Dwa przybliżenia: przesunięcie bywa inne o północy UTC niż o północy lokalnej (zmiana czasu).
  const first = midnightUtc - zoneOffsetMs(midnightUtc, timeZone);
  return new Date(midnightUtc - zoneOffsetMs(first, timeZone));
}
