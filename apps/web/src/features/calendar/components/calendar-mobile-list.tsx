import type { CalendarDto, CalendarReservationDto } from '@klucznik/api-client';
import { Ban } from 'lucide-react';

import { formatDate, formatStayRange } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/status-badge';

interface CalendarMobileListProps {
  data: CalendarDto;
  reservations: readonly CalendarReservationDto[];
  onOpenReservation: (id: string) => void;
}

/** O3 na telefonie: uproszczona lista rezerwacji i blokad per pokój. */
export function CalendarMobileList({
  data,
  reservations,
  onOpenReservation,
}: CalendarMobileListProps) {
  return (
    <div className="grid gap-4">
      {data.rooms.map((room) => {
        const items = [
          ...reservations
            .filter((reservation) => reservation.roomId === room.id)
            .map((reservation) => ({
              kind: 'reservation' as const,
              date: reservation.checkIn,
              reservation,
            })),
          ...data.blocks
            .filter((block) => block.roomId === room.id)
            .map((block) => ({ kind: 'block' as const, date: block.dateFrom, block })),
        ].sort((a, b) => a.date.localeCompare(b.date));
        return (
          <section key={room.id} className="rounded-lg border bg-card">
            <h2 className="border-b px-4 py-3 text-title-sm">{room.name}</h2>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Wolne w całym okresie.</p>
            ) : (
              <ul className="divide-y">
                {items.map((item) =>
                  item.kind === 'reservation' ? (
                    <li key={item.reservation.id}>
                      <button
                        type="button"
                        onClick={() => onOpenReservation(item.reservation.id)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent"
                      >
                        <span className="grid">
                          <span className="font-medium">{item.reservation.guestName}</span>
                          <span className="text-sm text-muted-foreground tabular">
                            {formatStayRange(item.reservation.checkIn, item.reservation.checkOut)}
                          </span>
                        </span>
                        <StatusBadge status={item.reservation.status} />
                      </button>
                    </li>
                  ) : (
                    <li
                      key={item.block.id}
                      className="flex items-center gap-3 bg-hatched px-4 py-3 text-sm text-muted-foreground"
                    >
                      <Ban className="size-4 shrink-0" aria-hidden="true" />
                      Blokada{item.block.reason ? ` – ${item.block.reason}` : ''}: noce{' '}
                      {formatDate(item.block.dateFrom)} – {formatDate(item.block.dateTo)}
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
