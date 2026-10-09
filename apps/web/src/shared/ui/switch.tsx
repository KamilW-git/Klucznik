import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/** Przełącznik (np. „Widoczny na stronie”). Wymaga `aria-label` albo powiązanej etykiety. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input/60 transition-colors data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
        // Cel dotykowy 44 px bez powiększania przełącznika.
        'before:absolute before:-inset-2 before:content-[""]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-6 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}
