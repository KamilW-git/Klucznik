import { Check } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

const STEPS = ['Termin', 'Dane', 'Potwierdzenie'] as const;

/** Kroki procesu rezerwacji (P3: krok 2, P4: krok 3); bieżący z `aria-current="step"`. */
export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Kroki rezerwacji">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                  done && 'border-success/30 bg-success-soft text-success',
                  active && 'border-primary bg-primary text-primary-foreground',
                  !done && !active && 'bg-card text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : step}
              </span>
              <span
                className={cn(
                  'truncate text-sm',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
                {done && <span className="sr-only"> (gotowe)</span>}
              </span>
              {step < STEPS.length && (
                <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
