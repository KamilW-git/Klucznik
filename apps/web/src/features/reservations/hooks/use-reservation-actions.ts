import {
  isApiError,
  useReservationsCancel,
  useReservationsConfirm,
  type ReservationDto,
} from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';

import { invalidateReservations } from '@/shared/lib/invalidate';
import { notifyError, notifySuccess } from '@/shared/lib/notify';

/** Komunikat dla potwierdzenia po czasie (BR-07: `INVALID_STATUS_TRANSITION` z `expired: true`). */
function confirmErrorTitle(error: unknown): string {
  return isApiError(error) && error.details?.['expired'] === true
    ? 'Prośba wygasła przed potwierdzeniem'
    : 'Nie udało się potwierdzić rezerwacji';
}

/** Potwierdzenie rezerwacji `PENDING` z toastem i odświeżeniem list, kalendarza i pulpitu. */
export function useConfirmReservation() {
  const queryClient = useQueryClient();
  return useReservationsConfirm({
    mutation: {
      onSuccess: (reservation: ReservationDto) => {
        notifySuccess(
          'Rezerwacja została potwierdzona',
          reservation.guest.email
            ? `Gość dostanie e-mail z potwierdzeniem na adres ${reservation.guest.email}.`
            : undefined,
        );
      },
      onError: (error) => notifyError(error, confirmErrorTitle(error)),
      onSettled: () => invalidateReservations(queryClient),
    },
  });
}

/** Anulowanie (dla `PENDING`: odrzucenie) z powodem; błąd pokazuje dialog wywołującego. */
export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useReservationsCancel({
    mutation: {
      onSuccess: (reservation: ReservationDto) => {
        notifySuccess(
          reservation.confirmedAt ? 'Rezerwacja została anulowana' : 'Prośba została odrzucona',
          reservation.guest.email ? 'Gość dostanie e-mail z informacją.' : undefined,
        );
      },
      onSettled: () => invalidateReservations(queryClient),
    },
  });
}
