import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/** Poziom 1: biała karta z delikatną ramką na tle `background`. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-lg border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="card-header" className={cn('grid gap-1 p-5 pb-0', className)} {...props} />
  );
}

export function CardTitle({ className, children, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 data-slot="card-title" className={cn('text-title text-foreground', className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5', className)} {...props} />;
}
