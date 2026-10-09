import { Hammer } from 'lucide-react';

import { EmptyState } from '@/shared/ui/states';

/** Zaślepka trasy, której widok powstaje w kolejnym etapie (M11–M13). */
export function ComingSoonPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="grid gap-6">
      <h1 className="text-headline max-sm:text-[1.625rem]">{title}</h1>
      <EmptyState
        icon={<Hammer aria-hidden="true" />}
        title="Ten widok jest w przygotowaniu"
        description={`Pojawi się w etapie ${milestone}.`}
      />
    </div>
  );
}
