import type { ReactNode } from 'react';

import { Button } from './button';
import { Dialog, DialogContent } from './dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` dla akcji nieodwracalnych (usunięcie, anulowanie). */
  tone?: 'primary' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  /** Dodatkowa treść (np. pole „Powód”, alert błędu). */
  children?: ReactNode;
}

/** Potwierdzenie akcji nieodwracalnej. Dialog nie zamyka się sam: robi to wywołujący po sukcesie. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Anuluj',
  tone = 'destructive',
  loading,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={tone} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
