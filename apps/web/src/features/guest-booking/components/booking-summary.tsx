import type {
  PublicNightPriceDto,
  PublicPropertyDto,
  RoomAvailabilityDto,
} from '@klucznik/api-client';
import { BedDouble, CalendarDays, Hourglass, ShieldCheck, Users } from 'lucide-react';

import {
  formatCancellationPolicy,
  formatConfirmationTime,
  formatGuests,
  type StaySearch,
} from '@/features/public-property';
import { formatDate, formatNights, nightsBetween } from '@/shared/lib/dates';
import { fileUrl } from '@/shared/lib/file-url';
import { formatMoney } from '@/shared/lib/money';

interface BookingSummaryProps {
  property: PublicPropertyDto;
  item: RoomAvailabilityDto;
  search: StaySearch;
  currency: string;
}

/** Grupy kolejnych nocy w tej samej cenie: „2 noce × 450 zł”. */
function priceGroups(breakdown: readonly PublicNightPriceDto[]) {
  const groups: { price: number; count: number; from: string }[] = [];
  for (const night of breakdown) {
    const last = groups.at(-1);
    if (last && last.price === night.price) last.count += 1;
    else groups.push({ price: night.price, count: 1, from: night.date });
  }
  return groups;
}

/** Podsumowanie P3: pokój, termin, goście, rozbicie ceny z API, zasady anulowania i potwierdzenia. */
export function BookingSummary({ property, item, search, currency }: BookingSummaryProps) {
  const cover = item.room.photos[0];
  const nights = nightsBetween(search.checkIn, search.checkOut);

  return (
    <section
      aria-labelledby="booking-summary-title"
      className="grid overflow-hidden rounded-lg border bg-card"
    >
      <div className="relative aspect-[16/7] bg-accent">
        {cover ? (
          <img
            src={fileUrl(cover.url)}
            alt={cover.altText ?? item.room.name}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/40">
            <BedDouble className="size-10" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="grid gap-4 p-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase">{property.name}</p>
          <h2 id="booking-summary-title" className="text-title">
            {item.room.name}
          </h2>
        </div>

        <dl className="grid gap-3 rounded-md bg-accent p-4 text-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <dt className="text-muted-foreground">Termin pobytu</dt>
              <dd className="text-base font-semibold tabular">
                {formatDate(search.checkIn)} – {formatDate(search.checkOut)}
              </dd>
              <dd className="text-muted-foreground">{formatNights(nights)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <dt className="text-muted-foreground">Liczba gości</dt>
              <dd className="text-base font-semibold">{formatGuests(search.guests)}</dd>
            </div>
          </div>
        </dl>

        <div className="grid gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Szczegóły ceny</h3>
          <ul className="grid gap-1.5 text-sm">
            {priceGroups(item.breakdown ?? []).map((group) => (
              <li key={group.from} className="flex justify-between gap-4 tabular">
                <span>
                  {formatNights(group.count)} × {formatMoney(group.price, currency)}
                </span>
                <span>{formatMoney(group.count * group.price, currency)}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline justify-between gap-4 border-t pt-3">
            <span className="text-base font-semibold">Łącznie za pobyt</span>
            <span className="text-title-lg text-primary tabular">
              {item.totalPrice !== null ? formatMoney(item.totalPrice, currency) : '–'}
            </span>
          </p>
        </div>

        <p className="flex gap-3 rounded-md border border-highlight/30 bg-highlight/10 p-3 text-sm">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-highlight-strong" aria-hidden="true" />
          <span>
            <span className="font-semibold">Rezerwacja wymaga potwierdzenia przez gospodarza</span>{' '}
            – odpowiedź otrzymasz e-mailem {formatConfirmationTime(property.pendingExpiryHours)}.
          </span>
        </p>
        <p className="flex gap-3 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {formatCancellationPolicy(property.cancellationDeadlineDays)}. Nie pobieramy żadnych
            opłat przy wysłaniu prośby.
          </span>
        </p>
      </div>
    </section>
  );
}
