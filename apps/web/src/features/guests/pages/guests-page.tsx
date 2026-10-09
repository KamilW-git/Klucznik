import { useGuestsList, type GuestListItemDto } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { routes } from '@/app/routes';
import { useCurrentProperty } from '@/features/current-property';
import { formatDate } from '@/shared/lib/dates';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui/button';
import { DataTable, type Column, type SortState } from '@/shared/ui/data-table';
import { Input, InputGroup } from '@/shared/ui/input';
import { PageHeader } from '@/shared/ui/page-header';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState } from '@/shared/ui/states';

const COLUMNS: readonly Column<GuestListItemDto>[] = [
  {
    id: 'name',
    header: 'Gość',
    sortField: 'lastName',
    cell: (row) => (
      <span className="font-medium">
        {row.firstName} {row.lastName}
      </span>
    ),
  },
  { id: 'email', header: 'E-mail', cell: (row) => row.email ?? '–' },
  {
    id: 'phone',
    header: 'Telefon',
    cell: (row) => row.phone ?? '–',
    className: 'hidden md:table-cell',
  },
  {
    id: 'reservations',
    header: 'Rezerwacje',
    align: 'right',
    cell: (row) => row.reservationsCount,
  },
  {
    id: 'lastStay',
    header: 'Ostatni pobyt',
    sortField: 'lastStayAt',
    cell: (row) =>
      row.lastStayAt ? <span className="tabular">{formatDate(row.lastStayAt)}</span> : '–',
  },
];

const DEFAULT_SORT: SortState = { field: 'lastName', direction: 'asc' };

/** Lista gości obiektu (wzorzec tabeli z O4); kliknięcie → rezerwacje gościa. */
export function GuestsPage() {
  const property = useCurrentProperty();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20),
  );
  const q = searchParams.get('q') ?? '';
  const [sortField, sortDirection] = (searchParams.get('sort') ?? '').split(':');
  const sort: SortState =
    sortField === 'lastName' || sortField === 'lastStayAt'
      ? { field: sortField, direction: sortDirection === 'desc' ? 'desc' : 'asc' }
      : DEFAULT_SORT;

  const [search, setSearch] = useState(q);
  const debounced = useDebouncedValue(search.trim(), 300);

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

  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy tylko na wpisany tekst
  }, [debounced]);

  const guests = useGuestsList(
    property.id,
    {
      page,
      pageSize,
      sort: `${sort.field}:${sort.direction}`,
      ...(q.length >= 2 && { q }),
    },
    { query: { placeholderData: keepPreviousData } },
  );

  return (
    <div className="grid gap-6">
      <PageHeader title="Goście" description="Goście obiektu z rezerwacji online i ręcznych." />
      <div className="max-w-xl">
        <InputGroup startIcon={<Search />}>
          <Input
            type="search"
            aria-label="Szukaj gościa"
            placeholder="Imię, nazwisko, e-mail lub telefon"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
      </div>
      {guests.isError && !guests.data ? (
        <ErrorState
          error={guests.error}
          onRetry={() => void guests.refetch()}
          retrying={guests.isFetching}
        />
      ) : (
        <DataTable
          caption="Goście"
          columns={COLUMNS}
          rows={guests.data?.data}
          getRowId={(row) => row.id}
          rowLabel={(row) => `${row.firstName} ${row.lastName}, pokaż rezerwacje`}
          loading={guests.isPending}
          fetching={guests.isPlaceholderData}
          sort={sort}
          onSortChange={(next) =>
            setParams({
              sort:
                next.field === DEFAULT_SORT.field && next.direction === DEFAULT_SORT.direction
                  ? null
                  : `${next.field}:${next.direction}`,
              page: null,
            })
          }
          onRowClick={(row) =>
            void navigate(
              `${routes.panel.reservations()}?${new URLSearchParams({ q: row.email ?? row.lastName }).toString()}`,
            )
          }
          empty={
            q ? (
              <EmptyState
                title="Brak gości pasujących do wyszukiwania"
                description={`Nie znaleziono gościa dla „${q}”.`}
                actions={
                  <Button variant="outline" onClick={() => setSearch('')}>
                    Wyczyść wyszukiwanie
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Users aria-hidden="true" />}
                title="Nie masz jeszcze gości"
                description="Goście pojawią się tu po pierwszej rezerwacji."
              />
            )
          }
          footer={
            guests.data && (
              <Pagination
                meta={guests.data.meta}
                itemsLabel="gości"
                onPageChange={(next) => setParams({ page: next > 1 ? String(next) : null })}
                onPageSizeChange={(size) =>
                  setParams({ pageSize: size === 20 ? null : String(size), page: null })
                }
              />
            )
          }
        />
      )}
    </div>
  );
}
