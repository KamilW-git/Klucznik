import { isApiError, useRoomsRemove, useRoomsUpdate } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';

import { invalidateRooms } from '@/shared/lib/invalidate';
import { notifyError, notifySuccess } from '@/shared/lib/notify';

/** Liczba przyszłych rezerwacji z `HAS_FUTURE_RESERVATIONS` (BR-10). */
export function futureReservationsCount(error: unknown): number | null {
  if (!isApiError(error) || error.code !== 'HAS_FUTURE_RESERVATIONS') return null;
  const count = error.details?.['count'];
  return typeof count === 'number' ? count : 0;
}

/** Przełącznik „Widoczny na stronie” (`PATCH isActive`); ukrycie z przyszłymi rezerwacjami → BR-10. */
export function useToggleRoomActive() {
  const queryClient = useQueryClient();
  return useRoomsUpdate({
    mutation: {
      onSuccess: (room) =>
        notifySuccess(
          room.isActive ? `${room.name} jest widoczny na stronie` : `${room.name} jest ukryty`,
        ),
      onError: (error) => {
        const count = futureReservationsCount(error);
        notifyError(
          error,
          count !== null
            ? 'Nie można ukryć pokoju z przyszłymi rezerwacjami'
            : 'Nie udało się zmienić widoczności',
        );
      },
      onSettled: () => invalidateRooms(queryClient),
    },
  });
}

export function useRemoveRoom() {
  const queryClient = useQueryClient();
  return useRoomsRemove({
    mutation: {
      onSuccess: () => {
        notifySuccess('Pokój został usunięty');
        void invalidateRooms(queryClient);
      },
    },
  });
}
