import { usePublicOccupancy } from '@klucznik/api-client';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';

import { occupiedNightPredicate } from '@/shared/lib/date-matchers';
import { toApiDate } from '@/shared/lib/dates';
import { PUBLIC_AVAILABILITY_QUERY } from '@/shared/lib/public-query';

/**
 * Zajęte noce pokoju w widocznych miesiącach (`GET /public/properties/:slug/occupancy`, maks. 93 dni,
 * Q-17): rezerwacje `PENDING`/`CONFIRMED` i blokady, bez danych gości.
 */
export function usePublicRoomOccupancy(
  slug: string,
  roomId: string | null,
  options: { months?: number; initialMonth?: Date } = {},
) {
  const months = options.months ?? 2;
  const [month, setMonth] = useState(() => startOfMonth(options.initialMonth ?? new Date()));
  const occupancy = usePublicOccupancy(
    slug,
    { from: toApiDate(month), to: toApiDate(endOfMonth(addMonths(month, months - 1))) },
    {
      query: {
        ...PUBLIC_AVAILABILITY_QUERY,
        enabled: Boolean(roomId),
        placeholderData: (previous) => previous,
      },
    },
  );

  const nights = occupancy.data?.rooms.find((room) => room.roomId === roomId)?.occupiedNights;
  const isNightUnavailable = useMemo(
    () =>
      occupiedNightPredicate(
        (nights ?? []).map((night) => ({ from: night, to: night, exclusiveEnd: false })),
      ),
    [nights],
  );

  return {
    isNightUnavailable,
    month,
    onMonthChange: (next: Date) => setMonth(startOfMonth(next)),
    isLoading: occupancy.isPending && Boolean(roomId),
    isError: occupancy.isError,
  };
}
