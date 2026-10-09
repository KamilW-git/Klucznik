import type { PublicRoomDto } from '@klucznik/api-client';
import { startOfDay } from 'date-fns';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { routes } from '@/app/routes';
import { formatNights } from '@/shared/lib/dates';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DateRangePicker, type DateRangeValue } from '@/shared/ui/date-range-picker';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormField } from '@/shared/ui/form-field';
import { Stepper } from '@/shared/ui/stepper';

import { usePublicRoomOccupancy } from '../hooks/use-public-room-occupancy';

interface RoomDatesDialogProps {
  slug: string;
  /** Pokój, którego terminy pokazujemy; `null` zamyka dialog. */
  room: PublicRoomDto | null;
  onClose: () => void;
  initialGuests?: number;
}

/**
 * „Zobacz terminy” (P1, P2): kalendarz pokoju z zajętymi nocami (`/occupancy`), wybór terminu
 * i liczby gości → wyniki P2 z ceną.
 */
export function RoomDatesDialog({ slug, room, onClose, initialGuests }: RoomDatesDialogProps) {
  return (
    <Dialog open={room !== null} onOpenChange={(open) => !open && onClose()}>
      {room && (
        <RoomDatesContent slug={slug} room={room} onClose={onClose} initialGuests={initialGuests} />
      )}
    </Dialog>
  );
}

function RoomDatesContent({
  slug,
  room,
  onClose,
  initialGuests,
}: RoomDatesDialogProps & { room: PublicRoomDto }) {
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 768px)');
  const today = useMemo(() => startOfDay(new Date()), []);
  const occupancy = usePublicRoomOccupancy(slug, room.id, { months: 2 });
  const [stay, setStay] = useState<DateRangeValue | null>(null);
  const [guests, setGuests] = useState(Math.min(initialGuests ?? 2, room.capacity));

  function showPrice() {
    if (!stay) return;
    onClose();
    void navigate(
      routes.public.availability(slug, { checkIn: stay.from, checkOut: stay.to, guests }),
    );
  }

  return (
    <DialogContent
      size="lg"
      title={`Terminy: ${room.name}`}
      description="Zajęte noce są przekreślone. Wybierz dzień przyjazdu i wyjazdu."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="accent" onClick={showPrice} disabled={!stay}>
            <Search aria-hidden="true" />
            Sprawdź cenę
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        {occupancy.isError && (
          <Alert variant="warning" title="Nie udało się pobrać zajętości pokoju">
            Wybierz termin – dostępność sprawdzimy w następnym kroku.
          </Alert>
        )}
        <DateRangePicker
          inline
          aria-label="Termin pobytu"
          value={stay}
          onChange={setStay}
          fromDate={today}
          numberOfMonths={wide ? 2 : 1}
          isNightUnavailable={occupancy.isNightUnavailable}
          onMonthChange={occupancy.onMonthChange}
          defaultMonth={occupancy.month}
        />
        {room.minNights > 1 && (
          <p className="text-sm text-muted-foreground">
            Minimalny pobyt: {formatNights(room.minNights)} (w sezonie może być dłuższy).
          </p>
        )}
        <FormField label="Liczba gości" hint={`Pokój mieści do ${room.capacity} os.`}>
          <Stepper
            value={guests}
            onChange={setGuests}
            min={1}
            max={room.capacity}
            className="max-w-52"
          />
        </FormField>
      </div>
    </DialogContent>
  );
}
