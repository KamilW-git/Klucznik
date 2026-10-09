import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

import { useFieldControlProps } from './form-field-context';

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  const field = useFieldControlProps();
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        'w-full min-w-0 rounded-md border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted aria-invalid:border-destructive',
        className,
      )}
      {...field}
      {...props}
    />
  );
}
