import { useRoomsList, type ReservationStatus } from '@klucznik/api-client';
import { FilterX, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { RESERVATION_STATUS_LABELS } from '@/shared/lib/reservation-status';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui/button';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { Input, InputGroup } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

import type { ReservationFilters as Filters } from '../hooks/use-reservation-filters';

const STATUS_ORDER: readonly ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
];
const ALL_ROOMS = '__all__';

interface ReservationFiltersProps {
  propertyId: string;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  hasFilters: boolean;
}

/** Filtry O4: wyszukiwarka (debounce), statusy (wielokrotny wybór), pokój, pobyt od–do. */
export function ReservationFilters({
  propertyId,
  filters,
  onChange,
  onClear,
  hasFilters,
}: ReservationFiltersProps) {
  const rooms = useRoomsList(propertyId);
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebouncedValue(search, 300);

  // Wyszukiwarka → URL po przerwie w pisaniu; zmiana URL z zewnątrz (wyczyść) → pole.
  useEffect(() => {
    if (debounced.trim() !== filters.q.trim()) onChange({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na wpisany tekst
  }, [debounced]);
  const [lastQ, setLastQ] = useState(filters.q);
  if (filters.q !== lastQ) {
    setLastQ(filters.q);
    if (filters.q.trim() !== search.trim()) setSearch(filters.q);
  }

  const toggleStatus = (status: ReservationStatus) =>
    onChange({
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((item) => item !== status)
        : [...filters.statuses, status],
    });

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4">
      <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
        <Chip active={filters.statuses.length === 0} onClick={() => onChange({ statuses: [] })}>
          Wszystkie
        </Chip>
        {STATUS_ORDER.map((status) => (
          <Chip
            key={status}
            active={filters.statuses.includes(status)}
            onClick={() => toggleStatus(status)}
          >
            {RESERVATION_STATUS_LABELS[status]}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <InputGroup startIcon={<Search />}>
          <Input
            type="search"
            aria-label="Szukaj rezerwacji"
            placeholder="Nazwisko, e-mail lub numer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <Select
          aria-label="Pokój"
          value={filters.roomId ?? ALL_ROOMS}
          onValueChange={(value) => onChange({ roomId: value === ALL_ROOMS ? null : value })}
          options={[
            { value: ALL_ROOMS, label: 'Wszystkie pokoje' },
            ...(rooms.data?.data ?? []).map((room) => ({ value: room.id, label: room.name })),
          ]}
        />
        <DateRangePicker
          mode="nights"
          aria-label="Pobyt od–do"
          placeholder="Pobyt od–do"
          value={filters.from ? { from: filters.from, to: filters.to ?? filters.from } : null}
          onChange={(range) => onChange({ from: range?.from ?? null, to: range?.to ?? null })}
        />
        <Button variant="outline" onClick={onClear} disabled={!hasFilters}>
          <FilterX aria-hidden="true" />
          Wyczyść filtry
        </Button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card text-foreground hover:border-primary/40 hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
