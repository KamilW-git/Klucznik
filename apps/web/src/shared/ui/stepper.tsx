import { Minus, Plus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import { useFieldControlProps } from './form-field-context';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Tekst po liczbie, np. odmiana „noce”. */
  format?: (value: number) => string;
  className?: string;
  'aria-label'?: string;
}

/** Licznik z przyciskami − / + (44 px) i polem liczbowym (np. liczba gości, minimalna liczba nocy). */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  format,
  className,
  'aria-label': ariaLabel,
}: StepperProps) {
  const field = useFieldControlProps();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-1 rounded-md border border-input bg-card px-1',
        className,
      )}
    >
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-full text-primary hover:bg-accent disabled:opacity-40"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Zmniejsz"
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <input
        {...field}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        }}
        className="w-full min-w-10 [appearance:textfield] bg-transparent text-center text-base font-semibold tabular focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {format && (
        <span className="pr-1 text-sm whitespace-nowrap text-muted-foreground" aria-hidden="true">
          {format(value)}
        </span>
      )}
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-full text-primary hover:bg-accent disabled:opacity-40"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Zwiększ"
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
