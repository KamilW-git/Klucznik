import type { PaginationMetaDto } from '@klucznik/api-client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './button';
import { Select } from './select';

const PAGE_SIZES = [10, 20, 50, 100] as const;

interface PaginationProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Rzeczownik w dopełniaczu liczby mnogiej, np. „rezerwacji”. */
  itemsLabel: string;
}

/** „1–20 z 134 rezerwacji”, rozmiar strony i przyciski poprzednia / następna. */
export function Pagination({ meta, onPageChange, onPageSizeChange, itemsLabel }: PaginationProps) {
  const first = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const last = Math.min(meta.page * meta.pageSize, meta.totalItems);
  return (
    <nav
      aria-label="Stronicowanie"
      className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground tabular" aria-live="polite">
        {first}–{last} z {meta.totalItems} {itemsLabel}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select
            aria-label="Liczba wierszy na stronie"
            className="h-11 w-36"
            value={String(meta.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: `${size} na stronę`,
            }))}
          />
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Poprzednia strona"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="min-w-16 text-center text-sm tabular">
          {meta.page} / {Math.max(1, meta.totalPages)}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Następna strona"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
