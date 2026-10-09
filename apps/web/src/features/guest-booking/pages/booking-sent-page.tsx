import { CalendarDays, Copy, House, Mail, Users } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';

import { PublicContainer } from '@/app/layouts/public-layout';
import { routes } from '@/app/routes';
import {
  formatConfirmationTime,
  formatGuests,
  usePublicProperty,
} from '@/features/public-property';
import { formatDate, formatDateTime, formatNights } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { notifySuccess } from '@/shared/lib/notify';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { buttonVariants } from '@/shared/ui/button-variants';
import { StatusBadge } from '@/shared/ui/status-badge';

import { createdRoomName, isBookingSentState } from '../booking-sent-state';
import { BookingSteps } from '../components/booking-steps';

/**
 * P4 „Potwierdzenie wysłania” (`/o/:slug/rezerwacja/wyslana`): dane z odpowiedzi mutacji (state
 * routera). Bez stanu (odświeżenie, wejście z linku) → strona obiektu.
 */
export function BookingSentPage() {
  const property = usePublicProperty();
  const location = useLocation();
  useDocumentMeta({ title: `Prośba wysłana – ${property.name}`, robots: 'noindex' });

  const state: unknown = location.state;
  if (!isBookingSentState(state)) {
    return <Navigate to={routes.public.property(property.slug)} replace />;
  }
  const { reservation } = state;
  const roomName = createdRoomName(reservation.room);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(reservation.number);
      notifySuccess('Skopiowano numer rezerwacji');
    } catch {
      // Brak uprawnień do schowka: numer i tak jest widoczny na ekranie.
    }
  }

  return (
    <PublicContainer className="grid max-w-3xl gap-6 py-6 lg:py-10">
      <BookingSteps current={3} />

      <section className="grid gap-6 rounded-xl border bg-card p-5 text-center sm:p-8">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <House className="size-8" aria-hidden="true" />
        </div>
        <div className="grid gap-2">
          <h1 className="text-[1.625rem] leading-8 font-bold lg:text-headline">
            Dziękujemy! Twoja prośba o rezerwację została wysłana
          </h1>
          <p className="text-base text-muted-foreground">
            Gospodarz dostał powiadomienie. Odpowiedź wyślemy e-mailem.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Numer</span>
            <span className="text-title-sm tabular">{reservation.number}</span>
            <button
              type="button"
              onClick={() => void copyNumber()}
              className="flex size-11 items-center justify-center rounded-md text-primary hover:bg-accent"
              aria-label="Kopiuj numer rezerwacji"
            >
              <Copy className="size-5" aria-hidden="true" />
            </button>
          </div>
          <StatusBadge status="PENDING" label="Oczekuje na potwierdzenie" />
        </div>
      </section>

      <section className="flex gap-4 rounded-lg border border-success/20 bg-success-soft/60 p-5">
        <Mail className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
        <div className="grid gap-1 text-base">
          <p className="font-semibold">
            Gospodarz potwierdzi rezerwację {formatConfirmationTime(property.pendingExpiryHours)}
          </p>
          <p className="text-sm text-muted-foreground">
            Szczegóły i link do zarządzania rezerwacją wysłaliśmy na adres{' '}
            <strong className="break-all text-foreground">{reservation.guestEmail}</strong>. Bez
            potwierdzenia do {formatDateTime(reservation.expiresAt)} prośba wygaśnie.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="sent-summary-title"
        className="grid gap-4 rounded-lg border bg-card p-5"
      >
        <h2 id="sent-summary-title" className="text-title-sm">
          Podsumowanie pobytu
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {roomName && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Pokój</dt>
              <dd className="text-base font-semibold">{roomName}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <dt className="text-sm text-muted-foreground">Termin pobytu</dt>
              <dd className="text-base font-semibold tabular">
                {formatDate(reservation.checkIn)} – {formatDate(reservation.checkOut)}
              </dd>
              <dd className="text-sm text-muted-foreground">{formatNights(reservation.nights)}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Users className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <dt className="text-sm text-muted-foreground">Liczba gości</dt>
              <dd className="text-base font-semibold">{formatGuests(reservation.guestsCount)}</dd>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t pt-4 sm:col-span-2">
            <dt className="text-base font-semibold">Łącznie za pobyt</dt>
            <dd className="text-title-lg text-primary tabular">
              {formatMoney(reservation.totalPrice, reservation.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="next-steps-title" className="grid gap-3">
        <h2 id="next-steps-title" className="text-title-sm">
          Co dzieje się dalej?
        </h2>
        <ol className="grid gap-3">
          {[
            [
              'Gospodarz sprawdza prośbę',
              `Potwierdzi ją ${formatConfirmationTime(property.pendingExpiryHours)}. W razie pytań zadzwoni do Ciebie.`,
            ],
            [
              'Dostajesz e-mail z decyzją',
              'Po potwierdzeniu termin jest Twój. Płatność ustalasz bezpośrednio z gospodarzem.',
            ],
            [
              'Rezerwacją zarządzasz z linku w e-mailu',
              'Sprawdzisz status i – zgodnie z zasadami obiektu – anulujesz rezerwację.',
            ],
          ].map(([title, text], index) => (
            <li key={title} className="flex gap-4 rounded-lg border bg-card p-4">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="grid gap-0.5">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={routes.public.property(property.slug)}
          className={buttonVariants({ variant: 'accent', size: 'lg' })}
        >
          <House aria-hidden="true" />
          Wróć na stronę obiektu
        </Link>
        {property.phone && (
          <p className="text-sm text-muted-foreground">
            Pytania?{' '}
            <a
              href={`tel:${property.phone.replace(/\s+/g, '')}`}
              className="font-semibold text-primary underline underline-offset-4"
            >
              {property.phone}
            </a>
          </p>
        )}
      </div>
    </PublicContainer>
  );
}
