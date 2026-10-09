import {
  getPublicGetReservationQueryKey,
  isApiError,
  usePublicCancelReservation,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getErrorMessage } from '@/shared/lib/api-errors';
import { notifySuccess } from '@/shared/lib/notify';
import { invalidatePublicAvailability } from '@/shared/lib/public-query';
import { Alert } from '@/shared/ui/alert';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FormField } from '@/shared/ui/form-field';
import { Textarea } from '@/shared/ui/textarea';

interface GuestCancelDialogProps {
  token: string;
  number: string;
  pending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASON_MAX = 500;

/**
 * Anulowanie przez gościa z linku (`POST /public/reservations/:token/cancel`, BR-08). Po odmowie
 * (termin minął, zmiana statusu) odświeżamy rezerwację, żeby ekran pokazał aktualny stan.
 */
export function GuestCancelDialog({
  token,
  number,
  pending,
  open,
  onOpenChange,
}: GuestCancelDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const cancel = usePublicCancelReservation();
  const queryKey = getPublicGetReservationQueryKey(token);

  const close = (next: boolean) => {
    if (!next) {
      setReason('');
      cancel.reset();
    }
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={close}
      title={pending ? 'Anulować prośbę o rezerwację?' : 'Anulować rezerwację?'}
      description={`Rezerwacja ${number} zostanie anulowana, a gospodarz dostanie powiadomienie. Tej operacji nie można cofnąć.`}
      confirmLabel="Anuluj rezerwację"
      cancelLabel="Wróć"
      loading={cancel.isPending}
      onConfirm={() =>
        cancel.mutate(
          { token, data: { reason: reason.trim() || null } },
          {
            onSuccess: (reservation) => {
              queryClient.setQueryData(queryKey, reservation);
              void invalidatePublicAvailability(queryClient);
              close(false);
              notifySuccess('Rezerwacja została anulowana', 'Potwierdzenie wyślemy e-mailem.');
            },
            onError: (error) => {
              if (isApiError(error) && error.status !== 429) {
                void queryClient.invalidateQueries({ queryKey });
              }
            },
          },
        )
      }
    >
      <div className="grid gap-4">
        <FormField
          label="Powód (opcjonalnie)"
          hint="Gospodarz zobaczy powód w powiadomieniu."
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
