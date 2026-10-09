import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/** Szkielet ładowania („shimmer” w leśnym tonie, S1). Dekoracyjny: stan ogłasza kontener. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-shimmer rounded-md bg-primary/10', className)}
      {...props}
    />
  );
}
