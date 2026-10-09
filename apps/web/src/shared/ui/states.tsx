import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { getErrorMessage, getRequestId } from '@/shared/lib/api-errors';
import { cn } from '@/shared/lib/cn';

import { Button } from './button';
import { Skeleton } from './skeleton';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Akcje, np. „Dodaj rezerwację”, „Wyczyść filtry”. */
  actions?: ReactNode;
  className?: string;
}

/** Stan pusty (S1): brak danych albo brak wyników filtra. */
export function EmptyState({ title, description, icon, actions, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary [&_svg]:size-7">
        {icon ?? <Inbox aria-hidden="true" />}
      </div>
      <h2 className="text-title-sm text-foreground">{title}</h2>
      {description && <p className="max-w-md text-base text-muted-foreground">{description}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

interface ErrorStateProps {
  /** Błąd zapytania; komunikat z mapy `code` → tekst. */
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Stan błędu ładowania widoku (S1) z „Spróbuj ponownie”. */
export function ErrorState({
  error,
  title = 'Coś poszło nie tak. Spróbuj ponownie',
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  const requestId = getRequestId(error);
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-t-4 border-t-destructive bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive-soft text-destructive [&_svg]:size-7">
        <TriangleAlert aria-hidden="true" />
      </div>
      <h2 className="text-title-sm text-foreground">{title}</h2>
      {error !== undefined && (
        <p className="max-w-md text-base text-muted-foreground">{getErrorMessage(error)}</p>
      )}
      {requestId && (
        <p className="text-xs text-muted-foreground">
          Identyfikator zgłoszenia: <span className="font-mono">{requestId}</span>
        </p>
      )}
      {onRetry && (
        <Button className="mt-2" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw aria-hidden="true" />}
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}

/** Szkielet strony (S1): nagłówek i karty; ogłaszany czytnikom jako „Ładowanie…”. */
export function PageSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      data-slot="page-skeleton"
      role="status"
      aria-live="polite"
      className={cn('grid gap-6', className)}
    >
      <span className="sr-only">Ładowanie…</span>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 rounded-lg border bg-card p-5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
