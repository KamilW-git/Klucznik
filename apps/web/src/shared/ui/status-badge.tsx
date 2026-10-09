import type { ReservationStatus } from '@klucznik/api-client';
import { cva } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';
import { RESERVATION_STATUS_LABELS } from '@/shared/lib/reservation-status';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.02em] whitespace-nowrap',
  {
    variants: {
      status: {
        PENDING: 'bg-status-pending text-status-pending-foreground',
        CONFIRMED: 'bg-status-confirmed text-status-confirmed-foreground',
        CANCELLED: 'bg-status-cancelled text-status-cancelled-foreground',
        EXPIRED: 'bg-status-expired text-status-expired-foreground',
        COMPLETED: 'bg-status-completed text-status-completed-foreground',
      },
    },
  },
);

interface StatusBadgeProps {
  status: ReservationStatus;
  /** Dłuższa etykieta, np. „Oczekuje na potwierdzenie” w szczegółach. */
  label?: string;
  className?: string;
}

/** Status rezerwacji: kolor + zawsze tekst (kolor nie jest jedynym nośnikiem informacji). */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span data-slot="status-badge" className={cn(badgeVariants({ status }), className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label ?? RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}
