import { useAdminOwnersList, type OwnerListItemDto } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { Lock, LockOpen, Pencil, UserPlus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { formatDate, pluralize } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { DataTable, type Column, type SortState } from '@/shared/ui/data-table';
import { FilterChip } from '@/shared/ui/filter-chip';
import { PageHeader } from '@/shared/ui/page-header';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState } from '@/shared/ui/states';

import { ActiveBadge } from '../components/badges';
import { CreateOwnerDialog } from '../components/create-owner-dialog';
import { EditOwnerDialog } from '../components/edit-owner-dialog';
import { OwnerAccessDialog } from '../components/owner-access-dialog';
import { SearchField } from '../components/search-field';
import { searchQuery, useListSearchParams } from '../hooks/use-list-search-params';

const SORT_FIELDS = ['createdAt', 'lastName'] as const;
const DEFAULT_SORT: SortState = { field: 'createdAt', direction: 'desc' };

/** A1 „Właściciele” (admin-owners.md): lista z wyszukiwaniem, statusem, zakładanie, edycja, blokada. */
export function OwnersPage() {
  const list = useListSearchParams();
  const q = list.searchParams.get('q') ?? '';
  const isActive = list.boolean('isActive');
  const [sortField, sortDirection] = (list.searchParams.get('sort') ?? '').split(':');
  const sort: SortState = SORT_FIELDS.includes(sortField as (typeof SORT_FIELDS)[number])
    ? { field: sortField!, direction: sortDirection === 'asc' ? 'asc' : 'desc' }
    : DEFAULT_SORT;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OwnerListItemDto | null>(null);
  const [access, setAccess] = useState<OwnerListItemDto | null>(null);

  const owners = useAdminOwnersList(
    {
      page: list.page,
      pageSize: list.pageSize,
      sort: `${sort.field}:${sort.direction}`,
      q: searchQuery(q),
      isActive,
    },
    { query: { placeholderData: keepPreviousData } },
  );

  // Kolumna akcji otwiera dialogi tej strony, więc kolumny powstają w komponencie (React Compiler je memoizuje).
  const columns: readonly Column<OwnerListItemDto>[] = [
    {
      id: 'name',
      header: 'Imię i nazwisko',
      sortField: 'lastName',
      cell: (row) => (
        <span className="font-medium">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (row) => row.email,
    },
    {
      id: 'properties',
      header: 'Obiekty',
      align: 'right',
      cell: (row) =>
        row.propertiesCount > 0 ? (
          <Link
            to={routes.admin.properties({ ownerId: row.id })}
            className="font-semibold text-primary underline underline-offset-4"
            aria-label={`${row.propertiesCount} ${pluralize(row.propertiesCount, 'obiekt', 'obiekty', 'obiektów')}: ${row.firstName} ${row.lastName}`}
          >
            {row.propertiesCount}
          </Link>
        ) : (
          0
        ),
    },
    {
      id: 'reservations',
      header: 'Rezerwacje (30 dni)',
      align: 'right',
      className: 'hidden lg:table-cell',
      cell: (row) => row.reservationsLast30Days,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <ActiveBadge active={row.isActive} inactiveLabel="Zablokowany" />,
    },
    {
      id: 'createdAt',
      header: 'Utworzono',
      sortField: 'createdAt',
      className: 'hidden md:table-cell',
      cell: (row) => <span className="tabular">{formatDate(row.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Akcje',
      align: 'right',
      cell: (row) => {
        const name = `${row.firstName} ${row.lastName}`;
        return (
          <span className="inline-flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(row)}
              aria-label={`Edytuj: ${name}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccess(row)}
              aria-label={row.isActive ? `Zablokuj: ${name}` : `Odblokuj: ${name}`}
              className={row.isActive ? 'text-destructive hover:bg-destructive-soft' : undefined}
            >
              {row.isActive ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
            </Button>
          </span>
        );
      },
    },
  ];

  const filtered = Boolean(searchQuery(q)) || isActive !== undefined;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Właściciele"
        description="Konta gospodarzy: zakładanie, edycja i blokowanie."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus aria-hidden="true" />
            Nowy właściciel
          </Button>
        }
      />

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <SearchField
          value={q}
          onCommit={(value) => list.set({ q: value || null })}
          label="Szukaj właściciela"
          placeholder="Imię, nazwisko lub e-mail"
        />
        <div role="group" aria-label="Status konta" className="flex flex-wrap gap-2">
          <FilterChip active={isActive === undefined} onClick={() => list.set({ isActive: null })}>
            Wszyscy
          </FilterChip>
          <FilterChip active={isActive === true} onClick={() => list.set({ isActive: 'true' })}>
            Aktywni
          </FilterChip>
          <FilterChip active={isActive === false} onClick={() => list.set({ isActive: 'false' })}>
            Zablokowani
          </FilterChip>
        </div>
      </div>

      {owners.isError && !owners.data ? (
        <ErrorState
          error={owners.error}
          onRetry={() => void owners.refetch()}
          retrying={owners.isFetching}
        />
      ) : (
        <DataTable
          caption="Właściciele"
          columns={columns}
          rows={owners.data?.data}
          getRowId={(row) => row.id}
          loading={owners.isPending}
          fetching={owners.isPlaceholderData}
          sort={sort}
          onSortChange={(next) =>
            list.set({
              sort:
                next.field === DEFAULT_SORT.field && next.direction === DEFAULT_SORT.direction
                  ? null
                  : `${next.field}:${next.direction}`,
            })
          }
          rowClassName={(row) => (row.isActive ? undefined : 'bg-muted/50')}
          empty={
            filtered ? (
              <EmptyState
                title="Brak właścicieli pasujących do filtrów"
                actions={
                  <Button variant="outline" onClick={() => list.set({ q: null, isActive: null })}>
                    Wyczyść filtry
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<UsersRound aria-hidden="true" />}
                title="Nie ma jeszcze właścicieli"
                description="Załóż pierwsze konto gospodarza – od razu z obiektem."
                actions={<Button onClick={() => setCreating(true)}>Nowy właściciel</Button>}
              />
            )
          }
          footer={
            owners.data && (
              <Pagination
                meta={owners.data.meta}
                itemsLabel="właścicieli"
                onPageChange={list.setPage}
                onPageSizeChange={list.setPageSize}
              />
            )
          }
        />
      )}

      <CreateOwnerDialog open={creating} onOpenChange={setCreating} />
      <EditOwnerDialog owner={editing} onClose={() => setEditing(null)} />
      <OwnerAccessDialog owner={access} onClose={() => setAccess(null)} />
    </div>
  );
}
