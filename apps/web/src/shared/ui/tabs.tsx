import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex gap-1 overflow-x-auto border-b', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        '-mb-px flex min-h-12 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 text-base font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-primary data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary [&_svg]:size-5',
        className,
      )}
      {...props}
    />
  );
}
