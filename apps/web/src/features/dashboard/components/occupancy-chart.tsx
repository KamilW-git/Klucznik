import type { OccupancyDayDto } from '@klucznik/api-client';
import { isWeekend } from 'date-fns';

import { cn } from '@/shared/lib/cn';
import { formatDate, parseApiDate } from '@/shared/lib/dates';
import { Tooltip } from '@/shared/ui/tooltip';

/**
 * Obłożenie w najbliższych 30 dniach: słupek = zajęte pokoje / wszystkie (CSS, bez biblioteki).
 * Dla czytników ekranu ta sama treść jako tabela.
 */
export function OccupancyChart({ days }: { days: readonly OccupancyDayDto[] }) {
  const average =
    days.length === 0
      ? 0
      : Math.round(
          (days.reduce(
            (sum, day) => sum + (day.totalRooms ? day.occupiedRooms / day.totalRooms : 0),
            0,
          ) /
            days.length) *
            100,
        );

  return (
    <figure className="grid gap-4">
      <figcaption className="text-sm text-muted-foreground">
        Średnio zajęte {average}% pokoi. Weekendy wyróżnione.
      </figcaption>
      <div className="flex h-40 items-end gap-1" aria-hidden="true">
        {days.map((day) => {
          const ratio = day.totalRooms ? day.occupiedRooms / day.totalRooms : 0;
          const date = parseApiDate(day.date);
          return (
            <Tooltip
              key={day.date}
              content={`${formatDate(day.date)}: ${day.occupiedRooms} z ${day.totalRooms} pokoi`}
            >
              <div className="flex h-full flex-1 flex-col justify-end rounded-sm bg-muted">
                <div
                  className={cn(
                    'rounded-sm bg-primary transition-[height]',
                    isWeekend(date) && 'bg-primary-hover',
                    ratio === 0 && 'bg-transparent',
                  )}
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex gap-1 text-[0.6875rem] text-muted-foreground tabular" aria-hidden="true">
        {days.map((day) => {
          const date = parseApiDate(day.date);
          return (
            <span
              key={day.date}
              className={cn(
                'flex-1 text-center',
                isWeekend(date) && 'font-semibold text-highlight-strong',
              )}
            >
              {date.getDate()}
            </span>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Obłożenie w najbliższych 30 dniach</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Zajęte pokoje</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{formatDate(day.date)}</td>
              <td>
                {day.occupiedRooms} z {day.totalRooms}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
