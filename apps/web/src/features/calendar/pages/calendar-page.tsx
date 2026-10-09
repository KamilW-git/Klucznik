import { useAvailabilityCalendar } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Ban, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { BlockDialog } from '@/features/availability';
import { useCurrentProperty } from '@/features/current-property';
import {
  ManualReservationDialog,
  ReservationDrawer,
  type ManualReservationPrefill,
} from '@/features/reservations';
import { cn } from '@/shared/lib/cn';
import { parseApiDate, pluralize, toApiDate } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';
import { Select } from '@/shared/ui/select';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';

import { calendarWindow, shiftAnchor, windowLabel, type CalendarView } from '../calendar-layout';
import { CalendarMobileList } from '../components/calendar-mobile-list';
import { OccupancyGrid } from '../components/occupancy-grid';

const STATUS_FILTERS = [
  { value: 'all', label: 'Wszystkie statusy' },
  { value: 'CONFIRMED', label: 'Tylko potwierdzone' },
  { value: 'PENDING', label: 'Tylko oczekujące' },
  { value: 'COMPLETED', label: 'Tylko zakończone' },
] as const;

/** O3: kalendarz obłożenia (`?from&view=2w|month&status`), paski rezerwacji i blokad. */
export function CalendarPage() {
  const property = useCurrentProperty();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);

  const view: CalendarView = searchParams.get('view') === '2w' ? '2w' : 'month';
  const fromParam = searchParams.get('from');
  const anchor =
    fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? parseApiDate(fromParam) : today;
  const status =
    STATUS_FILTERS.find((item) => item.value === searchParams.get('status'))?.value ?? 'all';
  const window = calendarWindow(anchor, view);

  const setParams = (patch: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  const calendar = useAvailabilityCalendar(
    property.id,
    { from: window.from, to: window.to },
    { query: { placeholderData: keepPreviousData } },
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [prefill, setPrefill] = useState<ManualReservationPrefill | null>(null);

  const reservations = useMemo(
    () =>
      (calendar.data?.reservations ?? []).filter(
        (reservation) => status === 'all' || reservation.status === status,
      ),
    [calendar.data, status],
  );
  const blocksCount = calendar.data?.blocks.length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Kalendarz obłożenia"
        description="Rezerwacje i blokady wszystkich pokoi na osi czasu."
        actions={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(true)} disabled={!calendar.data}>
              <Ban aria-hidden="true" />
              Zablokuj termin
            </Button>
            <Button onClick={() => setPrefill({})}>
              <Plus aria-hidden="true" />
              Dodaj rezerwację
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Poprzedni okres"
            onClick={() => setParams({ from: toApiDate(shiftAnchor(anchor, view, -1)) })}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <h2 className="min-w-48 text-center text-title-sm capitalize" aria-live="polite">
            {windowLabel(window, view, format(anchor, 'LLLL', { locale: pl }))}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Następny okres"
            onClick={() => setParams({ from: toApiDate(shiftAnchor(anchor, view, 1)) })}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <Button variant="secondary" onClick={() => setParams({ from: null })}>
          Dziś
        </Button>
        <div role="group" aria-label="Zakres widoku" className="flex rounded-lg border bg-card p-1">
          {(
            [
              ['2w', '2 tygodnie'],
              ['month', 'Miesiąc'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setParams({ view: value === 'month' ? null : value })}
              className={cn(
                'min-h-10 rounded-md px-4 text-sm font-medium',
                view === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Select
          aria-label="Filtr statusu"
          className="h-12 w-56"
          value={status}
          onValueChange={(value) => setParams({ status: value === 'all' ? null : value })}
          options={STATUS_FILTERS}
        />
        {calendar.data && (
          <p className="text-sm text-muted-foreground">
            {reservations.length}{' '}
            {pluralize(reservations.length, 'rezerwacja', 'rezerwacje', 'rezerwacji')} •{' '}
            {blocksCount} {pluralize(blocksCount, 'blokada', 'blokady', 'blokad')}
          </p>
        )}
      </div>

      {calendar.isPending ? (
        <PageSkeleton rows={4} />
      ) : calendar.isError ? (
        <ErrorState
          error={calendar.error}
          onRetry={() => void calendar.refetch()}
          retrying={calendar.isFetching}
        />
      ) : calendar.data.rooms.length === 0 ? (
        <EmptyState
          title="Brak pokoi w obiekcie"
          description="Dodaj pokoje w zakładce „Pokoje i domki”, aby zobaczyć kalendarz."
        />
      ) : (
        <>
          <div className={cn('hidden md:block', calendar.isPlaceholderData && 'opacity-60')}>
            <OccupancyGrid
              data={calendar.data}
              window={window}
              today={today}
              reservations={reservations}
              onOpenReservation={setOpenId}
              onCreateAt={(roomId, day) =>
                setPrefill({
                  roomId,
                  checkIn: day,
                  checkOut: toApiDate(addDays(parseApiDate(day), 1)),
                })
              }
            />
          </div>
          <div className="md:hidden">
            <CalendarMobileList
              data={calendar.data}
              reservations={reservations}
              onOpenReservation={setOpenId}
            />
          </div>
          <Legend />
        </>
      )}

      <ReservationDrawer reservationId={openId} onClose={() => setOpenId(null)} />
      <ManualReservationDialog
        propertyId={property.id}
        open={prefill !== null}
        onOpenChange={(open) => !open && setPrefill(null)}
        prefill={prefill ?? undefined}
        onCreated={(reservation) => setOpenId(reservation.id)}
      />
      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        rooms={calendar.data?.rooms ?? []}
      />
    </div>
  );
}

function Legend() {
  const items = [
    { className: 'bg-primary', label: 'Potwierdzona' },
    { className: 'bg-pending-stripes border border-warning/60', label: 'Oczekuje na decyzję' },
    { className: 'bg-status-completed', label: 'Zakończona' },
    {
      className: 'bg-hatched border border-dashed border-muted-foreground/50',
      label: 'Blokada terminu',
    },
    { className: 'bg-sand/40', label: 'Weekend' },
  ];
  return (
    <ul
      aria-label="Legenda"
      className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className={cn('h-4 w-6 rounded-sm', item.className)} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
