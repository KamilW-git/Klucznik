import { startOfDay } from 'date-fns';
import { Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { routes } from '@/app/routes';
import { cn } from '@/shared/lib/cn';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { Button } from '@/shared/ui/button';
import { DateRangePicker, type DateRangeValue } from '@/shared/ui/date-range-picker';
import { FormField } from '@/shared/ui/form-field';
import { Stepper } from '@/shared/ui/stepper';

import { formatGuests, MAX_GUESTS, type StaySearch } from '../stay-search';

interface StaySearchFormProps {
  slug: string;
  /** Największa pojemność pokoju obiektu (górna granica licznika gości). */
  maxGuests: number;
  initial?: StaySearch | null;
  /** Po przejściu do wyników (np. zwinięcie formularza „Zmień” w P2). */
  onSearched?: () => void;
  className?: string;
  id?: string;
}

/**
 * Wyszukiwarka pobytu (P1 hero, P2 „Zmień”): termin bez dat w przeszłości i liczba gości → P2.
 * Czy pokój jest wolny i ile kosztuje, liczy API.
 */
export function StaySearchForm({
  slug,
  maxGuests,
  initial,
  onSearched,
  className,
  id,
}: StaySearchFormProps) {
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 640px)');
  const today = useMemo(() => startOfDay(new Date()), []);
  const max = Math.min(MAX_GUESTS, Math.max(1, maxGuests, initial?.guests ?? 1));
  const [stay, setStay] = useState<DateRangeValue | null>(
    initial ? { from: initial.checkIn, to: initial.checkOut } : null,
  );
  const [guests, setGuests] = useState(Math.min(initial?.guests ?? 2, max));
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stay) {
      setError('Wybierz dzień przyjazdu i wyjazdu.');
      return;
    }
    void navigate(
      routes.public.availability(slug, { checkIn: stay.from, checkOut: stay.to, guests }),
    );
    onSearched?.();
  }

  return (
    <form
      id={id}
      role="search"
      aria-label="Sprawdź dostępność"
      noValidate
      onSubmit={handleSubmit}
      className={cn('grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-start', className)}
    >
      <FormField label="Termin pobytu" required error={error}>
        <DateRangePicker
          value={stay}
          onChange={(value) => {
            setStay(value);
            setError(undefined);
          }}
          fromDate={today}
          numberOfMonths={wide ? 2 : 1}
          placeholder="Przyjazd – wyjazd"
        />
      </FormField>
      <FormField label="Liczba gości" required>
        <Stepper value={guests} onChange={setGuests} min={1} max={max} format={formatGuestsWord} />
      </FormField>
      <Button type="submit" variant="accent" size="lg" className="md:mt-7">
        <Search aria-hidden="true" />
        Sprawdź dostępność
      </Button>
    </form>
  );
}

/** Odmiana po liczbie w liczniku („3 osoby” → „osoby”). */
function formatGuestsWord(count: number): string {
  return formatGuests(count).split(' ')[1] ?? '';
}
