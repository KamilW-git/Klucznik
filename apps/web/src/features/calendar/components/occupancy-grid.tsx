import type { CalendarBlockDto, CalendarDto, CalendarReservationDto } from '@klucznik/api-client';
import { format, isSameDay, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Ban } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';
import { formatDate, formatStayRange, toApiDate } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { RESERVATION_STATUS_LABELS } from '@/shared/lib/reservation-status';
import { Tooltip } from '@/shared/ui/tooltip';

import { barColumns, blockCheckout, type CalendarWindow } from '../calendar-layout';

interface OccupancyGridProps {
  data: CalendarDto;
  window: CalendarWindow;
  today: Date;
  reservations: readonly CalendarReservationDto[];
  onOpenReservation: (id: string) => void;
  /** Kliknięcie wolnego dnia: nowa rezerwacja od tego dnia. */
  onCreateAt: (roomId: string, day: string) => void;
}

const BAR_STYLES: Record<CalendarReservationDto['status'], string> = {
  CONFIRMED: 'bg-primary text-primary-foreground border-primary-hover',
  PENDING: 'bg-pending-stripes text-status-pending-foreground border-warning/60',
  COMPLETED:
    'bg-status-completed text-status-completed-foreground border-status-completed-foreground/30',
};

/**
 * O3: siatka pokoje × dni. Każdy dzień ma 2 kolumny (pół dnia), więc pasek pobytu zaczyna się
 * po południu dnia przyjazdu i kończy rano w dniu wyjazdu (availability.md).
 */
export function OccupancyGrid({
  data,
  window,
  today,
  reservations,
  onOpenReservation,
  onCreateAt,
}: OccupancyGridProps) {
  const dayCount = window.days.length;
  const columns: CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount * 2}, minmax(1.375rem, 1fr))`,
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="min-w-max">
        {/* Nagłówek dni */}
        <div className="flex border-b bg-background/60">
          <div className="sticky left-0 z-20 flex w-52 shrink-0 items-end border-r bg-card px-4 py-3 text-overline text-muted-foreground uppercase">
            Pokój
          </div>
          <div className="grid flex-1" style={columns}>
            {window.days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'col-span-2 grid justify-items-center border-l py-2 text-center',
                    isWeekend(day) && 'bg-sand/30',
                    isToday && 'bg-primary text-primary-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium capitalize',
                      isWeekend(day) && !isToday && 'text-highlight-strong',
                    )}
                  >
                    {format(day, 'EEEEEE', { locale: pl })}
                  </span>
                  <span className="text-base font-semibold tabular">{format(day, 'dd')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {data.rooms.map((room) => {
          const roomReservations = reservations.filter((item) => item.roomId === room.id);
          const roomBlocks = data.blocks.filter((item) => item.roomId === room.id);
          return (
            <div key={room.id} className="flex border-b last:border-b-0">
              <div
                className={cn(
                  'sticky left-0 z-20 flex w-52 shrink-0 flex-col justify-center border-r bg-card px-4 py-3',
                  !room.isActive && 'text-muted-foreground',
                )}
              >
                <span className="font-semibold">{room.name}</span>
                {!room.isActive && <span className="text-xs">ukryty na stronie</span>}
              </div>
              <div className="relative grid min-h-16 flex-1 grid-rows-1" style={columns}>
                {window.days.map((day, index) => (
                  <button
                    key={day.toISOString()}
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={() => onCreateAt(room.id, toApiDate(day))}
                    title={`Dodaj rezerwację od ${formatDate(day)}`}
                    style={{ gridColumn: `${index * 2 + 1} / span 2`, gridRow: 1 }}
                    className={cn(
                      'border-l hover:bg-accent/70',
                      isWeekend(day) && 'bg-sand/20',
                      isSameDay(day, today) && 'bg-primary/5',
                    )}
                  />
                ))}
                {roomBlocks.map((block) => (
                  <BlockBar key={block.id} block={block} window={window} />
                ))}
                {roomReservations.map((reservation) => (
                  <ReservationBar
                    key={reservation.id}
                    reservation={reservation}
                    window={window}
                    onOpen={() => onOpenReservation(reservation.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservationBar({
  reservation,
  window,
  onOpen,
}: {
  reservation: CalendarReservationDto;
  window: CalendarWindow;
  onOpen: () => void;
}) {
  const columns = barColumns(reservation.checkIn, reservation.checkOut, window);
  if (!columns) return null;
  const status = RESERVATION_STATUS_LABELS[reservation.status];
  const summary = `${reservation.number}, ${reservation.guestName}, ${formatStayRange(reservation.checkIn, reservation.checkOut)}, ${status}`;
  return (
    <Tooltip
      content={
        <span className="grid gap-0.5">
          <span className="font-semibold">{reservation.guestName}</span>
          <span>{formatStayRange(reservation.checkIn, reservation.checkOut)}</span>
          <span>
            {reservation.guestsCount} os. • {formatMoney(reservation.totalPrice)}
          </span>
          <span>
            {status} • {reservation.number}
          </span>
        </span>
      }
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={summary}
        style={{ gridColumn: `${columns.start} / ${columns.end}`, gridRow: 1 }}
        className={cn(
          'z-10 my-2 flex min-w-0 items-center overflow-hidden rounded-md border px-2 text-left text-xs font-semibold shadow-xs hover:brightness-95 focus-visible:z-30',
          BAR_STYLES[reservation.status],
          columns.clippedStart && 'rounded-l-none border-l-0',
          columns.clippedEnd && 'rounded-r-none border-r-0',
        )}
      >
        <span className="truncate">{reservation.guestName}</span>
      </button>
    </Tooltip>
  );
}

function BlockBar({ block, window }: { block: CalendarBlockDto; window: CalendarWindow }) {
  const columns = barColumns(block.dateFrom, blockCheckout(block.dateTo), window);
  if (!columns) return null;
  const label = `Blokada${block.reason ? ` – ${block.reason}` : ''}: noce ${formatDate(block.dateFrom)} – ${formatDate(block.dateTo)}`;
  return (
    <Tooltip content={label}>
      <span
        role="img"
        aria-label={label}
        style={{ gridColumn: `${columns.start} / ${columns.end}`, gridRow: 1 }}
        className={cn(
          'z-10 my-2 flex min-w-0 items-center gap-1 overflow-hidden rounded-md border border-dashed border-muted-foreground/50 bg-hatched px-2 text-xs font-medium text-muted-foreground',
          columns.clippedStart && 'rounded-l-none',
          columns.clippedEnd && 'rounded-r-none',
        )}
      >
        <Ban className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{block.reason ?? 'Blokada'}</span>
      </span>
    </Tooltip>
  );
}
