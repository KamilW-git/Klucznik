import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

const alertVariants = cva('relative flex gap-3 rounded-lg border p-4 text-base', {
  variants: {
    variant: {
      error: 'border-destructive/25 bg-destructive-soft text-destructive-hover',
      warning: 'border-warning/25 bg-warning-soft text-warning',
      success: 'border-success/20 bg-success-soft text-success',
      info: 'border-info/20 bg-info-soft text-info',
    },
  },
  defaultVariants: { variant: 'error' },
});

const icons = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
} as const;

interface AlertProps
  extends Omit<ComponentProps<'div'>, 'title'>, VariantProps<typeof alertVariants> {
  title: ReactNode;
  /** Przycisk akcji pod treścią (np. „Odśwież dane”). */
  action?: ReactNode;
  onDismiss?: () => void;
}

/** Komunikat inline: błąd reguły biznesowej nad przyciskiem zapisu, konflikt wersji, ostrzeżenie. */
export function Alert({
  className,
  variant,
  title,
  children,
  action,
  onDismiss,
  ...props
}: AlertProps) {
  const tone = variant ?? 'error';
  const Icon = icons[tone];
  return (
    <div
      data-slot="alert"
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant: tone }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="grid flex-1 gap-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="text-sm text-foreground/80">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
          aria-label="Zamknij komunikat"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
