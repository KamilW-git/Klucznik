import { Check } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

interface CheckboxProps extends Omit<ComponentProps<typeof CheckboxPrimitive.Root>, 'children'> {
  label: ReactNode;
  description?: ReactNode;
}

/** Pole wyboru 20 px z etykietą (cały wiersz klikalny, wysokość ≥ 44 px). */
export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-2', className)}>
      <CheckboxPrimitive.Root
        id={controlId}
        className="peer mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-input bg-card data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:opacity-50"
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={controlId} className="grid cursor-pointer gap-0.5 text-base">
        {label}
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
      </label>
    </div>
  );
}
