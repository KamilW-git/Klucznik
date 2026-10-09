import type { ReactNode } from 'react';
import { Outlet } from 'react-router';

interface PublicLayoutProps {
  /** Nagłówek z marką obiektu (nazwa, logo, kontakt) – dostarcza strona publiczna w M12. */
  header?: ReactNode;
}

/**
 * Strona publiczna obiektu (`/o/:slug`, `/r/:token`): white-label z marką obiektu, mobile-first,
 * maks. 1200 px, stopka „Rezerwacje obsługuje Klucznik”. Trasy dochodzą w M12.
 */
export function PublicLayout({ header }: PublicLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {header}
      <main className="mx-auto w-full max-w-[75rem] flex-1 px-4 py-6 sm:px-6 lg:py-10">
        <Outlet />
      </main>
      <footer className="border-t bg-card">
        <p className="mx-auto max-w-[75rem] px-4 py-6 text-sm text-muted-foreground sm:px-6">
          Rezerwacje obsługuje <span className="font-semibold text-primary">Klucznik</span>
        </p>
      </footer>
    </div>
  );
}
