import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Skeleton } from './skeleton';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Pole sortowania API (`sort=pole:asc`); brak = kolumna niesortowalna. */
  sortField?: string;
  align?: 'left' | 'right';
  /** Ukryj na wąskich ekranach (np. `hidden lg:table-cell`). */
  className?: string;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[] | undefined;
  getRowId: (row: T) => string;
  /** Pierwsze ładowanie: szkielet wierszy. */
  loading?: boolean;
  /** Treść zamiast tabeli przy pustej liście (`EmptyState`). */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Aktywny wiersz (np. otwarty w drawerze). */
  activeRowId?: string;
  /** Etykieta wiersza dla czytników (np. numer rezerwacji). */
  rowLabel?: (row: T) => string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  caption: string;
  footer?: ReactNode;
  /** Odświeżanie w tle (np. nowa strona): przygaszenie zamiast szkieletu. */
  fetching?: boolean;
}

/**
 * Tabela danych (wzorzec O4): nagłówki z sortowaniem, szkielet, stan pusty, klikalne wiersze
 * (Enter/Spacja z klawiatury), stopka na paginację.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  empty,
  onRowClick,
  activeRowId,
  rowLabel,
  sort,
  onSortChange,
  caption,
  footer,
  fetching,
}: DataTableProps<T>) {
  if (!loading && rows && rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left text-sm', fetching && 'opacity-60')}>
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-background/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={
                    sort && column.sortField === sort.field
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cn(
                    'px-4 py-3 text-overline whitespace-nowrap text-muted-foreground uppercase',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.sortField && onSortChange ? (
                    <SortButton column={column} sort={sort} onSortChange={onSortChange} />
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} aria-hidden="true">
                    {columns.map((column) => (
                      <td key={column.id} className={cn('px-4 py-4', column.className)}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => {
                  const id = getRowId(row);
                  const clickable = Boolean(onRowClick);
                  return (
                    <tr
                      key={id}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={rowLabel?.(row)}
                      aria-current={activeRowId === id ? 'true' : undefined}
                      onClick={clickable ? () => onRowClick?.(row) : undefined}
                      onKeyDown={
                        clickable
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onRowClick?.(row);
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        clickable &&
                          'cursor-pointer hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2',
                        activeRowId === id && 'bg-accent shadow-[inset_4px_0_0_var(--primary)]',
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            'px-4 py-3 align-middle text-sm',
                            column.align === 'right' && 'text-right tabular',
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {loading && (
        <span className="sr-only" role="status">
          Ładowanie…
        </span>
      )}
      {footer}
    </div>
  );
}

function SortButton<T>({
  column,
  sort,
  onSortChange,
}: {
  column: Column<T>;
  sort?: SortState;
  onSortChange: (sort: SortState) => void;
}) {
  const active = sort?.field === column.sortField;
  const Icon = !active ? ArrowUpDown : sort?.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      className={cn(
        '-mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 uppercase hover:bg-accent hover:text-primary',
        active && 'text-primary',
      )}
      onClick={() =>
        onSortChange({
          field: column.sortField!,
          direction: active && sort?.direction === 'asc' ? 'desc' : 'asc',
        })
      }
    >
      {column.header}
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}
