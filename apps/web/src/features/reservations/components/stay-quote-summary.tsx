import type { RoomQuoteDto } from '@klucznik/api-client';
import { CalendarCheck } from 'lucide-react';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import { formatDate, formatNights } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { Alert } from '@/shared/ui/alert';
import { Checkbox } from '@/shared/ui/checkbox';
import { Skeleton } from '@/shared/ui/skeleton';

interface StayQuoteSummaryProps {
  quote: RoomQuoteDto | undefined;
  loading: boolean;
  error: unknown;
  /** Pojemność wybranego pokoju (komunikat BR-02). */
  capacity?: number;
  /** Rezerwacja ręczna może pominąć minimalny pobyt (Q-01). */
  ignoreMinNights?: { checked: boolean; onChange: (checked: boolean) => void };
}

/** Grupy kolejnych nocy w tej samej cenie: „4 × 380 zł”. */
function priceGroups(quote: RoomQuoteDto) {
  const groups: { price: number; count: number }[] = [];
  for (const night of quote.breakdown) {
    const last = groups.at(-1);
    if (last && last.price === night.price) last.count += 1;
    else groups.push({ price: night.price, count: 1 });
  }
  return groups;
}

/**
 * „Cena wyliczona” i dostępność terminu z `GET /rooms/:id/quote` (O5, edycja).
 * Cena liczy wyłącznie API (BR-05); kolizje z numerami rezerwacji (BR-01).
 */
export function StayQuoteSummary({
  quote,
  loading,
  error,
  capacity,
  ignoreMinNights,
}: StayQuoteSummaryProps) {
  if (error) return <Alert title={getErrorMessage(error)} />;
  if (loading || !quote) {
    return loading ? (
      <div className="grid gap-2 rounded-lg border bg-background p-4" role="status">
        <span className="sr-only">Liczę cenę…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
    ) : (
      <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
        Wybierz pokój, termin i liczbę gości, aby zobaczyć cenę.
      </p>
    );
  }

  const reason = quote.unavailableReason;
  return (
    <div className="grid gap-3">
      <section
        aria-label="Cena wyliczona"
        className="grid gap-3 rounded-lg border border-success/20 bg-success-soft/60 p-4"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Cena wyliczona za pobyt</p>
            <p className="text-title-lg text-foreground tabular">
              {formatMoney(quote.totalPrice, quote.currency)}
            </p>
          </div>
          <p className="text-right text-sm text-muted-foreground">
            Liczba nocy
            <span className="block text-base font-semibold text-foreground">
              {formatNights(quote.nights)}
            </span>
          </p>
        </div>
        <ul className="grid gap-1 border-t border-success/15 pt-3 text-sm">
          {priceGroups(quote).map((group, index) => (
            <li key={index} className="flex justify-between tabular">
              <span>
                {group.count} × {formatMoney(group.price, quote.currency)} / noc
              </span>
              <span>{formatMoney(group.count * group.price, quote.currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      {reason === 'OCCUPIED' && (
        <Alert title="Wykryto kolizję – termin jest zajęty">
          <ul className="grid gap-1">
            {quote.conflicts.map((conflict) =>
              conflict.type === 'RESERVATION' ? (
                <li key={conflict.id}>
                  Rezerwacja{' '}
                  <Link
                    to={routes.panel.reservation(conflict.id)}
                    className="font-semibold underline underline-offset-2"
                  >
                    {conflict.number}
                  </Link>{' '}
                  ({formatDate(conflict.dateFrom)} – {formatDate(conflict.dateTo)})
                </li>
              ) : (
                <li key={conflict.id}>
                  Blokada terminu (noce {formatDate(conflict.dateFrom)} –{' '}
                  {formatDate(conflict.dateTo)})
                </li>
              ),
            )}
          </ul>
        </Alert>
      )}
      {reason === 'CAPACITY_EXCEEDED' && (
        <Alert title="Za dużo gości dla wybranego pokoju">
          {capacity !== undefined && `Pokój mieści najwyżej ${capacity} os.`}
        </Alert>
      )}
      {reason === 'ROOM_NOT_BOOKABLE' && (
        <Alert title="Ten pokój nie jest dostępny do rezerwacji">
          Pokój albo obiekt jest ukryty. Włącz go w ustawieniach, aby przyjmować rezerwacje.
        </Alert>
      )}
      {reason === 'MIN_NIGHTS_NOT_MET' && (
        <Alert
          variant="warning"
          title={`Minimalny pobyt w tym terminie: ${formatNights(quote.minNights)}`}
        >
          {ignoreMinNights && (
            <Checkbox
              className="text-foreground"
              label="Przyjmij krótszy pobyt mimo minimum"
              checked={ignoreMinNights.checked}
              onCheckedChange={(checked) => ignoreMinNights.onChange(checked === true)}
            />
          )}
        </Alert>
      )}
      {quote.available && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CalendarCheck className="size-4" aria-hidden="true" />
          Termin jest wolny.
        </p>
      )}
    </div>
  );
}
