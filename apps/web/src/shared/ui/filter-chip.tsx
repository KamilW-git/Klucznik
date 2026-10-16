import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Chip filtra (pigułka 44 px, `aria-pressed`); wybrany wypełniony kolorem `primary`. */
export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card text-foreground hover:border-primary/40 hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
