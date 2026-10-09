import type { ReservationStatus } from '@klucznik/api-client';
import { useState } from 'react';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { Alert } from '@/shared/ui/alert';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormField } from '@/shared/ui/form-field';
import { Textarea } from '@/shared/ui/textarea';

import { useCancelReservation } from '../hooks/use-reservation-actions';
import { cancelLabel } from '../labels';

interface CancelReservationDialogProps {
  reservation: { id: string; number: string; status: ReservationStatus } | null;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

const REASON_MAX = 500;

/** Anulowanie / odrzucenie z opcjonalnym powodem (trafia do e-maila gościa). */
export function CancelReservationDialog({
  reservation,
  onOpenChange,
  onCancelled,
}: CancelReservationDialogProps) {
  const [reason, setReason] = useState('');
  const cancel = useCancelReservation();
  const pending = reservation?.status === 'PENDING';

  const close = (open: boolean) => {
    if (!open) {
      setReason('');
      cancel.reset();
    }
    onOpenChange(open);
  };

  return (
    <ConfirmDialog
      open={reservation !== null}
      onOpenChange={close}
      title={pending ? 'Odrzucić prośbę o rezerwację?' : 'Anulować rezerwację?'}
      description={
        reservation &&
        (pending
          ? `Prośba ${reservation.number} zostanie odrzucona, a termin zwolniony.`
          : `Rezerwacja ${reservation.number} zostanie anulowana, a termin zwolniony. Tej operacji nie można cofnąć.`)
      }
      confirmLabel={reservation ? cancelLabel(reservation.status) : 'Anuluj'}
      cancelLabel="Wróć"
      loading={cancel.isPending}
      onConfirm={() => {
        if (!reservation) return;
        cancel.mutate(
          { id: reservation.id, data: { reason: reason.trim() || null } },
          {
            onSuccess: () => {
              close(false);
              onCancelled?.();
            },
          },
        );
      }}
    >
      <div className="grid gap-4">
        <FormField
          label="Powód (opcjonalnie)"
          hint="Gość zobaczy powód w e-mailu."
          error={reason.length > REASON_MAX ? `Najwyżej ${REASON_MAX} znaków.` : undefined}
        >
          <Textarea
            rows={3}
            value={reason}
            maxLength={REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        {cancel.isError && <Alert title={getErrorMessage(cancel.error)} />}
      </div>
    </ConfirmDialog>
  );
}
