import type { PublicRoomDto } from '@klucznik/api-client';
import { subDays } from 'date-fns';
import { useState } from 'react';

import { parseApiDate } from '@/shared/lib/dates';
import { Calendar } from '@/shared/ui/calendar';
import { FormField } from '@/shared/ui/form-field';
import { Select } from '@/shared/ui/select';

import { usePublicRoomOccupancy } from '../hooks/use-public-room-occupancy';
import type { StaySearch } from '../stay-search';

interface OccupancyMiniCalendarProps {
  slug: string;
  rooms: readonly PublicRoomDto[];
  search: StaySearch;
}

/** P2 (desktop): zajętość wybranego pokoju w miesiącu przyjazdu na tle szukanego terminu (`/occupancy`). */
export function OccupancyMiniCalendar({ slug, rooms, search }: OccupancyMiniCalendarProps) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const occupancy = usePublicRoomOccupancy(slug, roomId || null, {
    months: 1,
    initialMonth: parseApiDate(search.checkIn),
  });
  const stay = {
    from: parseApiDate(search.checkIn),
    to: subDays(parseApiDate(search.checkOut), 1),
  };

  return (
    <section aria-labelledby="occupancy-title" className="grid gap-4 rounded-lg border bg-card p-5">
      <h2 id="occupancy-title" className="text-title-sm">
        Kalendarz obłożenia
      </h2>
      <FormField label="Pokój">
        <Select
          value={roomId}
          onValueChange={setRoomId}
          options={rooms.map((room) => ({ value: room.id, label: room.name }))}
        />
      </FormField>
      <Calendar
        month={occupancy.month}
        onMonthChange={occupancy.onMonthChange}
        modifiers={{ occupied: occupancy.isNightUnavailable, stay }}
        modifiersClassNames={{
          occupied: 'rounded-md bg-status-expired text-muted-foreground line-through',
          stay: 'rounded-md bg-primary font-semibold text-primary-foreground no-underline',
        }}
        className="justify-self-center"
      />
      {occupancy.isError && (
        <p className="text-sm text-destructive">Nie udało się pobrać zajętości pokoju.</p>
      )}
      <ul className="grid gap-1.5 text-sm text-muted-foreground" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary" aria-hidden="true" />
          Szukany termin (noce)
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-status-expired" aria-hidden="true" />
          Noce zajęte
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm border bg-card" aria-hidden="true" />
          Noce wolne
        </li>
      </ul>
    </section>
  );
}
