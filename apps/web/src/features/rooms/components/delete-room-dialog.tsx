import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { pluralize } from '@/shared/lib/dates';
import { Alert } from '@/shared/ui/alert';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import { futureReservationsCount, useRemoveRoom } from '../hooks/use-room-mutations';

interface DeleteRoomDialogProps {
  room: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

/** Usunięcie pokoju (soft delete). `HAS_FUTURE_RESERVATIONS` → liczba rezerwacji i link do listy. */
export function DeleteRoomDialog({ room, onOpenChange, onDeleted }: DeleteRoomDialogProps) {
  const remove = useRemoveRoom();
  const count = futureReservationsCount(remove.error);

  const close = (open: boolean) => {
    if (!open) remove.reset();
    onOpenChange(open);
  };

  return (
    <ConfirmDialog
      open={room !== null}
      onOpenChange={close}
      title={`Usunąć pokój ${room?.name ?? ''}?`}
      description="Pokój zniknie z panelu i strony obiektu. Historia jego rezerwacji zostanie zachowana."
      confirmLabel="Usuń pokój"
      loading={remove.isPending}
      onConfirm={() =>
        room &&
        remove.mutate(
          { id: room.id },
          {
            onSuccess: () => {
              close(false);
              onDeleted?.();
            },
          },
        )
      }
    >
      {count !== null && room ? (
        <Alert title={`Nie można usunąć – istnieją przyszłe rezerwacje (${count})`}>
          Najpierw anuluj lub przenieś{' '}
          {pluralize(count, 'tę rezerwację', 'te rezerwacje', 'te rezerwacje')}:{' '}
          <Link
            className="font-semibold underline"
            to={`${routes.panel.reservations()}?roomId=${room.id}&status=PENDING,CONFIRMED`}
          >
            zobacz rezerwacje pokoju
          </Link>
          .
        </Alert>
      ) : (
        remove.isError && <Alert title={getErrorMessage(remove.error)} />
      )}
    </ConfirmDialog>
  );
}
