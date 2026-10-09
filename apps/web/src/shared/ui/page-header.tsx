import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Akcje po prawej (np. „+ Dodaj rezerwację”). */
  actions?: ReactNode;
  /** Elementy nad tytułem (np. okruszki). */
  eyebrow?: ReactNode;
  className?: string;
}

/** Nagłówek widoku panelu: h1, opis i akcje (na telefonie akcje pod tytułem). */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="grid gap-1">
        {eyebrow}
        <h1 className="text-headline max-sm:text-[1.625rem] max-sm:leading-8">{title}</h1>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
