import { CircleDot } from 'lucide-react';

import { Button } from './button';

interface SaveBarProps {
  /** `id` formularza, który zapisuje przycisk (submit poza `<form>`). */
  formId: string;
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  label?: string;
}

/** Przyklejony pasek „Zapisz zmiany” widoczny przy niezapisanych zmianach (O7, O8). */
export function SaveBar({
  formId,
  dirty,
  saving,
  onDiscard,
  label = 'Zapisz zmiany',
}: SaveBarProps) {
  if (!dirty && !saving) return null;
  return (
    <div
      role="region"
      aria-label="Niezapisane zmiany"
      className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-overlay sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <CircleDot className="size-4 text-highlight-strong" aria-hidden="true" />
        Masz niezapisane zmiany
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          Odrzuć zmiany
        </Button>
        <Button type="submit" form={formId} loading={saving}>
          {label}
        </Button>
      </div>
    </div>
  );
}
