import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export const DEFAULT_PAGE_SIZE = 20;

function positiveInt(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
}

/**
 * Stan list panelu admina w URL (`?page&pageSize&q&…`), żeby link z filtrami dało się udostępnić.
 * Zmiana filtra wraca na 1. stronę.
 */
export function useListSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = positiveInt(searchParams.get('page'), 1);
  const pageSize = positiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, 100);

  const set = useCallback(
    (patch: Record<string, string | null>) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const setPage = useCallback(
    (next: number) => set({ page: next > 1 ? String(next) : null }),
    [set],
  );
  const setPageSize = useCallback(
    (size: number) => set({ pageSize: size === DEFAULT_PAGE_SIZE ? null : String(size) }),
    [set],
  );

  /** `true` / `false` z parametru (np. `?isActive=false`), inaczej `undefined`. */
  const boolean = (key: string): boolean | undefined => {
    const value = searchParams.get(key);
    return value === 'true' ? true : value === 'false' ? false : undefined;
  };

  return { searchParams, page, pageSize, set, setPage, setPageSize, boolean };
}

/** Fraza wyszukiwania dla API (q od 2 znaków, inaczej pomijana). */
export function searchQuery(value: string | null): string | undefined {
  const q = value?.trim() ?? '';
  return q.length >= 2 ? q : undefined;
}
