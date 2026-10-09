import { Building2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';

import { useCurrentPropertyContext } from './current-property-context';

/** Widoki panelu dopiero po wyborze obiektu: szkielet, błąd albo stan „brak obiektu”. */
export function CurrentPropertyGate({ children }: { children: ReactNode }) {
  const { status, error, refetch } = useCurrentPropertyContext();
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'error') return <ErrorState error={error} onRetry={refetch} />;
  if (status === 'empty') {
    return (
      <EmptyState
        icon={<Building2 aria-hidden="true" />}
        title="Nie masz jeszcze obiektu"
        description="Obiekty zakłada administrator Klucznika. Skontaktuj się z administratorem, aby dodać swój obiekt."
      />
    );
  }
  return <>{children}</>;
}
