import type { ReservationStatus, ReservationsListParams } from '@klucznik/api-client';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { SortState } from '@/shared/ui/data-table';

const STATUSES: readonly ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
];
const SORT_FIELDS = ['checkIn', 'createdAt', 'number', 'totalPrice'] as const;
const DEFAULT_SORT: SortState = { field: 'checkIn', direction: 'asc' };
const DEFAULT_PAGE_SIZE = 20;

export interface ReservationFilters {
  page: number;
  pageSize: number;
  statuses: ReservationStatus[];
  roomId: string | null;
  from: string | null;
  to: string | null;
  q: string;
  sort: SortState;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function positiveInt(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
}

/** Filtry listy rezerwacji w URL (`?page&status&roomId&from&to&q&sort`), żeby link dało się udostępnić. */
export function useReservationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<ReservationFilters>(() => {
    const sortParam = searchParams.get('sort')?.split(':');
    const sortField = sortParam?.[0] as (typeof SORT_FIELDS)[number] | undefined;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    return {
      page: positiveInt(searchParams.get('page'), 1),
      pageSize: positiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, 100),
      statuses: (searchParams.get('status') ?? '')
        .split(',')
        .filter((status): status is ReservationStatus =>
          STATUSES.includes(status as ReservationStatus),
        ),
      roomId: searchParams.get('roomId'),
      from: from && DATE.test(from) ? from : null,
      to: to && DATE.test(to) ? to : null,
      q: searchParams.get('q') ?? '',
      sort:
        sortField && SORT_FIELDS.includes(sortField)
          ? { field: sortField, direction: sortParam?.[1] === 'desc' ? 'desc' : 'asc' }
          : DEFAULT_SORT,
    };
  }, [searchParams]);

  /** Zmiana filtrów wraca na 1. stronę (chyba że zmienia się sama strona). */
  const update = useCallback(
    (patch: Partial<ReservationFilters>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const set = (key: string, value: string | null) =>
            value ? next.set(key, value) : next.delete(key);
          if ('statuses' in patch) set('status', patch.statuses?.join(',') || null);
          if ('roomId' in patch) set('roomId', patch.roomId ?? null);
          if ('from' in patch) set('from', patch.from ?? null);
          if ('to' in patch) set('to', patch.to ?? null);
          if ('q' in patch) set('q', patch.q?.trim() || null);
          if ('sort' in patch && patch.sort) {
            const isDefault =
              patch.sort.field === DEFAULT_SORT.field &&
              patch.sort.direction === DEFAULT_SORT.direction;
            set('sort', isDefault ? null : `${patch.sort.field}:${patch.sort.direction}`);
          }
          if ('pageSize' in patch) {
            set('pageSize', patch.pageSize === DEFAULT_PAGE_SIZE ? null : String(patch.pageSize));
          }
          set('page', patch.page && patch.page > 1 ? String(patch.page) : null);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(
    () =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams();
          const pageSize = current.get('pageSize');
          if (pageSize) next.set('pageSize', pageSize);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const hasFilters =
    filters.statuses.length > 0 ||
    Boolean(filters.roomId || filters.from || filters.to || filters.q);

  return { filters, update, clear, hasFilters };
}

/** Filtry → parametry `GET /reservations` (q od 2 znaków). */
export function toListParams(
  filters: ReservationFilters,
  propertyId: string,
): ReservationsListParams {
  const q = filters.q.trim();
  return {
    propertyId,
    page: filters.page,
    pageSize: filters.pageSize,
    sort: `${filters.sort.field}:${filters.sort.direction}`,
    ...(filters.statuses.length > 0 && { status: filters.statuses.join(',') }),
    ...(filters.roomId && { roomId: filters.roomId }),
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(q.length >= 2 && { q }),
  };
}
