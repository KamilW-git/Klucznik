import { useAdminPropertiesList, type AdminPropertyListItemDto } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { Building2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { formatDate } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { FilterChip } from '@/shared/ui/filter-chip';
import { PageHeader } from '@/shared/ui/page-header';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState } from '@/shared/ui/states';

import { ActiveBadge } from '../components/badges';
import { OwnerPicker } from '../components/owner-picker';
import { SearchField } from '../components/search-field';
import { searchQuery, useListSearchParams } from '../hooks/use-list-search-params';

const COLUMNS: readonly Column<AdminPropertyListItemDto>[] = [
  {
    id: 'name',
    header: 'Obiekt',
    cell: (row) => (
      <span className="grid">
        <span className="font-medium">{row.name}</span>
        <span className="text-xs text-muted-foreground">/o/{row.slug}</span>
      </span>
    ),
  },
  {
    id: 'city',
    header: 'Miasto',
    className: 'hidden md:table-cell',
    cell: (row) => row.city ?? '–',
  },
  {
    id: 'owner',
    header: 'Właściciel',
    cell: (row) => (
      <Link
        to={routes.admin.owners({ q: row.owner.email })}
        className="grid rounded-sm hover:text-primary"
        aria-label={`Właściciel: ${row.owner.firstName} ${row.owner.lastName}, pokaż na liście właścicieli`}
      >
        <span className="font-medium">
          {row.owner.firstName} {row.owner.lastName}
        </span>
        <span className="text-xs text-muted-foreground">{row.owner.email}</span>
      </Link>
    ),
  },
  { id: 'rooms', header: 'Pokoje', align: 'right', cell: (row) => row.roomsCount },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <ActiveBadge active={row.isActive} inactiveLabel="Nieaktywny" />,
  },
  {
    id: 'createdAt',
    header: 'Utworzono',
    className: 'hidden lg:table-cell',
    cell: (row) => <span className="tabular">{formatDate(row.createdAt)}</span>,
  },
  {
    id: 'preview',
    header: 'Strona',
    align: 'right',
    cell: (row) =>
      row.isActive ? (
        <a
          href={routes.public.property(row.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 font-semibold whitespace-nowrap text-primary"
        >
          Podgląd
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only">strony {row.name} (nowa karta)</span>
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">niedostępna</span>
      ),
  },
];

/** „Obiekty” (admin-owners.md): wszystkie obiekty platformy z filtrem właściciela i podglądem strony. */
export function PropertiesPage() {
  const list = useListSearchParams();
  const q = list.searchParams.get('q') ?? '';
  const ownerId = list.searchParams.get('ownerId');
  const isActive = list.boolean('isActive');

  const properties = useAdminPropertiesList(
    {
      page: list.page,
      pageSize: list.pageSize,
      q: searchQuery(q),
      ownerId: ownerId ?? undefined,
      isActive,
    },
    { query: { placeholderData: keepPreviousData } },
  );

  const filtered = Boolean(searchQuery(q) || ownerId) || isActive !== undefined;

  return (
    <div className="grid gap-6">
      <PageHeader title="Obiekty" description="Wszystkie obiekty platformy, od najnowszych." />

      <div className="grid gap-4 rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <SearchField
            value={q}
            onCommit={(value) => list.set({ q: value || null })}
            label="Szukaj obiektu"
            placeholder="Nazwa lub miasto"
          />
          <OwnerPicker ownerId={ownerId} onChange={(id) => list.set({ ownerId: id })} />
        </div>
        <div role="group" aria-label="Status obiektu" className="flex flex-wrap gap-2">
          <FilterChip active={isActive === undefined} onClick={() => list.set({ isActive: null })}>
            Wszystkie
          </FilterChip>
          <FilterChip active={isActive === true} onClick={() => list.set({ isActive: 'true' })}>
            Aktywne
          </FilterChip>
          <FilterChip active={isActive === false} onClick={() => list.set({ isActive: 'false' })}>
            Nieaktywne
          </FilterChip>
        </div>
      </div>

      {properties.isError && !properties.data ? (
        <ErrorState
          error={properties.error}
          onRetry={() => void properties.refetch()}
          retrying={properties.isFetching}
        />
      ) : (
        <DataTable
          caption="Obiekty"
          columns={COLUMNS}
          rows={properties.data?.data}
          getRowId={(row) => row.id}
          loading={properties.isPending}
          fetching={properties.isPlaceholderData}
          empty={
            filtered ? (
              <EmptyState
                title="Brak obiektów pasujących do filtrów"
                actions={
                  <Button
                    variant="outline"
                    onClick={() => list.set({ q: null, ownerId: null, isActive: null })}
                  >
                    Wyczyść filtry
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Building2 aria-hidden="true" />}
                title="Nie ma jeszcze obiektów"
                description="Obiekt powstaje razem z kontem właściciela."
              />
            )
          }
          footer={
            properties.data && (
              <Pagination
                meta={properties.data.meta}
                itemsLabel="obiektów"
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
              />
            )
          }
        />
      )}
    </div>
  );
}
