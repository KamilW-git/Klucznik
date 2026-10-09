import { ErrorState } from '@/shared/ui/states';

/**
 * Nieobsłużony błąd renderowania albo nieudane pobranie kodu obszaru (np. po wdrożeniu nowej
 * wersji): pełnoekranowy `ErrorState` z przeładowaniem strony.
 */
export function RouteErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-5">
      <ErrorState className="w-full max-w-lg" onRetry={() => window.location.reload()} />
    </main>
  );
}
