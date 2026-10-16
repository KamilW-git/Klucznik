import { useAdminEmailLogsList, type EmailLogDto, type EmailStatus } from '@klucznik/api-client';
import { keepPreviousData } from '@tanstack/react-query';
import { CircleAlert, FilterX, Mail } from 'lucide-react';

import { formatDateTime } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { DataTable, type Column } from '@/shared/ui/data-table';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { FilterChip } from '@/shared/ui/filter-chip';
import { PageHeader } from '@/shared/ui/page-header';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { Tooltip } from '@/shared/ui/tooltip';

import { EmailStatusBadge } from '../components/badges';
import { SearchField } from '../components/search-field';
import { searchQuery, useListSearchParams } from '../hooks/use-list-search-params';
import { EMAIL_STATUS_LABELS, EMAIL_TEMPLATE_LABELS } from '../labels';

const STATUSES: readonly EmailStatus[] = ['FAILED', 'QUEUED', 'SENT'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const COLUMNS: readonly Column<EmailLogDto>[] = [
  {
    id: 'createdAt',
    header: 'Utworzono',
    cell: (row) => (
      <span className="tabular whitespace-nowrap">{formatDateTime(row.createdAt)}</span>
    ),
  },
  {
    id: 'recipient',
    header: 'Odbiorca',
    cell: (row) => row.recipient,
  },
  { id: 'template', header: 'Szablon', cell: (row) => EMAIL_TEMPLATE_LABELS[row.template] },
  {
    id: 'reservation',
    header: 'Rezerwacja',
    className: 'hidden lg:table-cell',
    cell: (row) => <span className="tabular">{row.reservationNumber ?? '–'}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <span className="inline-flex items-center gap-1">
        <EmailStatusBadge status={row.status} />
        {row.status === 'FAILED' && row.lastError && (
          <Tooltip content={row.lastError}>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-md text-destructive hover:bg-destructive-soft"
              aria-label={`Treść błędu: ${row.lastError}`}
            >
              <CircleAlert className="size-5" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </span>
    ),
  },
  { id: 'attempts', header: 'Próby', align: 'right', cell: (row) => row.attempts },
  {
    id: 'sentAt',
    header: 'Wysłano',
    className: 'hidden md:table-cell',
    cell: (row) =>
      row.sentAt ? <span className="tabular">{formatDateTime(row.sentAt)}</span> : '–',
  },
];

/**
 * „Logi e-maili” (admin-owners.md, notifications.md): filtr statusu, odbiorcy i dni utworzenia
 * (Europe/Warsaw, włącznie, Q-07). `FAILED` wyróżnione, treść błędu w podpowiedzi.
 */
export function EmailLogsPage() {
  const list = useListSearchParams();
  const q = list.searchParams.get('q') ?? '';
  const statusParam = list.searchParams.get('status');
  const status = STATUSES.find((item) => item === statusParam);
  const fromParam = list.searchParams.get('from');
  const toParam = list.searchParams.get('to');
  const from = fromParam && DATE.test(fromParam) ? fromParam : null;
  const to = toParam && DATE.test(toParam) && from && toParam >= from ? toParam : from;

  const logs = useAdminEmailLogsList(
    {
      page: list.page,
      pageSize: list.pageSize,
      status,
      q: searchQuery(q),
      ...(from && to && { from, to }),
    },
    { query: { placeholderData: keepPreviousData } },
  );

  const filtered = Boolean(status || searchQuery(q) || from);
  const clear = () => list.set({ status: null, q: null, from: null, to: null });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Logi e-maili"
        description="Wysyłka powiadomień do gości i gospodarzy, od najnowszych."
      />

      <div className="grid gap-4 rounded-lg border bg-card p-4">
        <div role="group" aria-label="Status wysyłki" className="flex flex-wrap gap-2">
          <FilterChip active={!status} onClick={() => list.set({ status: null })}>
            Wszystkie
          </FilterChip>
          {STATUSES.map((item) => (
            <FilterChip
              key={item}
              active={status === item}
              onClick={() => list.set({ status: item })}
            >
              {EMAIL_STATUS_LABELS[item]}
            </FilterChip>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_auto]">
          <SearchField
            value={q}
            onCommit={(value) => list.set({ q: value || null })}
            label="Szukaj odbiorcy"
            placeholder="Fragment adresu odbiorcy"
          />
          <DateRangePicker
            mode="nights"
            aria-label="Utworzono od–do"
            placeholder="Utworzono od–do"
            value={from && to ? { from, to } : null}
            onChange={(range) => list.set({ from: range?.from ?? null, to: range?.to ?? null })}
          />
          <Button variant="outline" onClick={clear} disabled={!filtered}>
            <FilterX aria-hidden="true" />
            Wyczyść filtry
          </Button>
        </div>
      </div>

      {logs.isError && !logs.data ? (
        <ErrorState
          error={logs.error}
          onRetry={() => void logs.refetch()}
          retrying={logs.isFetching}
        />
      ) : (
        <DataTable
          caption="Logi e-maili"
          columns={COLUMNS}
          rows={logs.data?.data}
          getRowId={(row) => row.id}
          loading={logs.isPending}
          fetching={logs.isPlaceholderData}
          rowClassName={(row) =>
            row.status === 'FAILED'
              ? 'bg-destructive-soft/60 shadow-[inset_4px_0_0_var(--destructive)]'
              : undefined
          }
          empty={
            filtered ? (
              <EmptyState
                title="Brak e-maili pasujących do filtrów"
                actions={
                  <Button variant="outline" onClick={clear}>
                    Wyczyść filtry
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Mail aria-hidden="true" />}
                title="Nie wysłano jeszcze żadnego e-maila"
                description="Logi pojawią się po pierwszej rezerwacji."
              />
            )
          }
          footer={
            logs.data && (
              <Pagination
                meta={logs.data.meta}
                itemsLabel="e-maili"
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
