import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

interface PublicLayoutProps {
  /** Nagłówek z marką obiektu (`PropertyHeader`); bez niego tylko treść i stopka. */
  header?: ReactNode;
  /** Nazwa obiektu w stopce (white-label). */
  brandName?: string;
  children: ReactNode;
}

/**
 * Strona publiczna obiektu (`/o/:slug`, `/r/:token`): white-label z marką obiektu, mobile-first,
 * treść maks. 1200 px (`PublicContainer`), stopka „Rezerwacje obsługuje Klucznik”.
 */
export function PublicLayout({ header, brandName, children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {header}
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <PublicContainer className="flex flex-col gap-1 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          {brandName && <p className="font-semibold text-foreground">{brandName}</p>}
          <p>
            Rezerwacje obsługuje <span className="font-semibold text-primary">Klucznik</span> – Twój
            e-recepcjonista
          </p>
        </PublicContainer>
      </footer>
    </div>
  );
}

/** Kontener treści strony publicznej (maks. 1200 px, marginesy 16 / 24 px). */
export function PublicContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[75rem] px-4 sm:px-6', className)} {...props} />;
}
