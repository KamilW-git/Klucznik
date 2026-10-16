import type { EmailStatus } from '@klucznik/api-client';

import { cn } from '@/shared/lib/cn';

import { EMAIL_STATUS_LABELS } from '../labels';

const pill =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.02em] whitespace-nowrap';

interface ActiveBadgeProps {
  active: boolean;
  /** „Aktywny / Zablokowany” (konto), „Aktywny / Nieaktywny” (obiekt). */
  inactiveLabel: string;
}

/** Status aktywności: kolor + zawsze tekst. */
export function ActiveBadge({ active, inactiveLabel }: ActiveBadgeProps) {
  return (
    <span
      className={cn(
        pill,
        active
          ? 'bg-status-confirmed text-status-confirmed-foreground'
          : 'bg-status-cancelled text-status-cancelled-foreground',
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {active ? 'Aktywny' : inactiveLabel}
    </span>
  );
}

const EMAIL_STATUS_CLASSES: Record<EmailStatus, string> = {
  QUEUED: 'bg-status-pending text-status-pending-foreground',
  SENT: 'bg-status-confirmed text-status-confirmed-foreground',
  FAILED: 'bg-status-cancelled text-status-cancelled-foreground',
};

/** Status wysyłki e-maila. */
export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={cn(pill, EMAIL_STATUS_CLASSES[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {EMAIL_STATUS_LABELS[status]}
    </span>
  );
}
