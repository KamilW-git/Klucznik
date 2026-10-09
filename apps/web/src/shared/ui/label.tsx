import { Label as LabelPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-1 text-base font-medium text-foreground select-none peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
