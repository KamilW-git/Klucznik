import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

interface SheetContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right';
  /** Tytuł dla czytników ekranu (wymagany przez Radix Dialog). */
  title: string;
  /** Pokaż tytuł wizualnie w nagłówku panelu. */
  showTitle?: boolean;
}

/** Panel boczny (Radix Dialog): menu mobilne, drawer szczegółów rezerwacji (M11). */
export function SheetContent({
  side = 'right',
  title,
  showTitle = false,
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 z-50 flex w-full max-w-sm flex-col bg-card shadow-overlay outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200',
          side === 'right'
            ? 'right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
            : 'left-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 p-4">
          <DialogPrimitive.Title className={cn('text-title', !showTitle && 'sr-only')}>
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="ml-auto flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
            aria-label="Zamknij"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
