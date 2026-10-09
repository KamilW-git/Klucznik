import { useAvailabilityCalendar } from '@klucznik/api-client';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';

import { occupiedNightPredicate, type NightRange } from '@/shared/lib/date-matchers';
import { toApiDate } from '@/shared/lib/dates';

/**
 * Zajęte noce pokoju w dwóch widocznych miesiącach kalendarza (rezerwacje `PENDING`/`CONFIRMED`
 * i blokady z `GET /properties/:id/calendar`). Edytowana rezerwacja nie blokuje swojego terminu.
 */
export function useRoomOccupancy(
  propertyId: string,
  roomId: string | null,
  options: { initialMonth?: Date; excludeReservationId?: string } = {},
) {
  const [month, setMonth] = useState(() => startOfMonth(options.initialMonth ?? new Date()));
  const from = toApiDate(startOfMonth(month));
  const to = toApiDate(endOfMonth(addMonths(month, 1)));
  const calendar = useAvailabilityCalendar(
    propertyId,
    { from, to },
    { query: { enabled: Boolean(roomId), placeholderData: (previous) => previous } },
  );

  const isNightUnavailable = useMemo(() => {
    const data = calendar.data;
    if (!data || !roomId) return () => false;
    const ranges: NightRange[] = [
      ...data.reservations
        .filter(
          (reservation) =>
            reservation.roomId === roomId &&
            reservation.status !== 'COMPLETED' &&
            reservation.id !== options.excludeReservationId,
        )
        .map((reservation) => ({
          from: reservation.checkIn,
          to: reservation.checkOut,
          exclusiveEnd: true,
        })),
      ...data.blocks
        .filter((block) => block.roomId === roomId)
        .map((block) => ({ from: block.dateFrom, to: block.dateTo, exclusiveEnd: false })),
    ];
    return occupiedNightPredicate(ranges);
  }, [calendar.data, roomId, options.excludeReservationId]);

  return {
    isNightUnavailable,
    onMonthChange: (next: Date) => setMonth(startOfMonth(next)),
    month,
  };
}
