import { useReservationsList, type ReservationListItemDto } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { routes } from '@/app/routes';
import { useCurrentProperty } from '@/features/current-property';
import { formatDate } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { PageHeader } from '@/shared/ui/page-header';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { StatusBadge } from '@/shared/ui/status-badge';

import { ManualReservationDialog } from '../components/manual-reservation-dialog';
import { ReservationDrawer } from '../components/reservation-drawer';
import { ReservationFilters } from '../components/reservation-filters';
import { toListParams, useReservationFilters } from '../hooks/use-reservation-filters';
import { SOURCE_LABELS } from '../labels';

const COLUMNS: readonly Column<ReservationListItemDto>[] = [
  {
    id: 'number',
    header: 'Numer',
    sortField: 'number',
    cell: (row) => <span className="font-semibold whitespace-nowrap tabular">{row.number}</span>,
  },
  {
    id: 'guest',
    header: 'Gość',
    cell: (row) => (
      <span className="grid">
        <span className="font-medium">
          {row.guest.firstName} {row.guest.lastName}
        </span>
        {row.guest.email && (
          <span className="text-xs text-muted-foreground">{row.guest.email}</span>
        )}
      </span>
    ),
  },
  { id: 'room', header: 'Pokój', cell: (row) => row.room.name },
  {
    id: 'checkIn',
    header: 'Przyjazd',
    sortField: 'checkIn',
    cell: (row) => <span className="tabular">{formatDate(row.checkIn)}</span>,
  },
  {
    id: 'checkOut',
    header: 'Wyjazd',
    cell: (row) => <span className="tabular">{formatDate(row.checkOut)}</span>,
    className: 'hidden md:table-cell',
  },
  {
    id: 'nights',
    header: 'Noce',
    align: 'right',
    cell: (row) => row.nights,
    className: 'hidden xl:table-cell',
  },
  {
    id: 'guests',
    header: 'Goście',
    align: 'right',
    cell: (row) => row.guestsCount,
    className: 'hidden xl:table-cell',
  },
  {
    id: 'total',
    header: 'Kwota',
    align: 'right',
    sortField: 'totalPrice',
    cell: (row) => (
      <span className="whitespace-nowrap">{formatMoney(row.totalPrice, row.currency)}</span>
    ),
  },
  { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: 'source',
    header: 'Źródło',
    cell: (row) => SOURCE_LABELS[row.source],
    className: 'hidden lg:table-cell',
  },
];

/** O4: lista rezerwacji z filtrami w URL i drawerem szczegółów (`/panel/rezerwacje/:id`). */
export function ReservationsPage() {
  const property = useCurrentProperty();
  const { id: openId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, update, clear, hasFilters } = useReservationFilters();
  const [createOpen, setCreateOpen] = useState(false);

  const query = useReservationsList(toListParams(filters, property.id), {
    query: { placeholderData: keepPreviousData },
  });

  const openReservation = (id: string) =>
    void navigate({ pathname: routes.panel.reservation(id), search: location.search });
  const closeReservation = () =>
    void navigate({ pathname: routes.panel.reservations(), search: location.search });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rezerwacje"
        description="Prośby z Twojej strony, rezerwacje ręczne i historia pobytów."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Dodaj rezerwację
          </Button>
        }
      />

      <ReservationFilters
        propertyId={property.id}
        filters={filters}
        onChange={update}
        onClear={clear}
        hasFilters={hasFilters}
      />

      {query.isError && !query.data ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <DataTable
          caption="Rezerwacje"
          columns={COLUMNS}
          rows={query.data?.data}
          getRowId={(row) => row.id}
          rowLabel={(row) =>
            `${row.number}, ${row.guest.firstName} ${row.guest.lastName}, otwórz szczegóły`
          }
          loading={query.isPending}
          fetching={query.isPlaceholderData}
          onRowClick={(row) => openReservation(row.id)}
          activeRowId={openId}
          sort={filters.sort}
          onSortChange={(sort) => update({ sort })}
          empty={
            hasFilters ? (
              <EmptyState
                title="Brak rezerwacji w wybranym filtrze"
                description="Nie znaleziono rezerwacji spełniających podane kryteria. Zmień filtry albo dodaj rezerwację ręcznie."
                actions={
                  <Button variant="outline" onClick={clear}>
                    Wyczyść filtry
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<ClipboardList aria-hidden="true" />}
                title="Nie masz jeszcze rezerwacji"
                description="Rezerwacje z Twojej strony obiektu pojawią się tutaj. Rezerwację telefoniczną dodasz ręcznie."
                actions={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus aria-hidden="true" />
                    Dodaj rezerwację
                  </Button>
                }
              />
            )
          }
          footer={
            query.data && (
              <Pagination
                meta={query.data.meta}
                itemsLabel="rezerwacji"
                onPageChange={(page) => update({ page })}
                onPageSizeChange={(pageSize) => update({ pageSize })}
              />
            )
          }
        />
      )}

      <ReservationDrawer reservationId={openId ?? null} onClose={closeReservation} />
      <ManualReservationDialog
        propertyId={property.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(reservation) => openReservation(reservation.id)}
      />
    </div>
  );
}
