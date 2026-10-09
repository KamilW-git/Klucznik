import {
  isApiError,
  usePublicGetReservation,
  type PublicReservationDto,
} from '@klucznik/api-client';
import {
  BedDouble,
  CalendarDays,
  CircleCheck,
  Clock,
  LinkIcon,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { PublicContainer, PublicLayout } from '@/app/layouts/public-layout';
import { routes } from '@/app/routes';
import {
  formatAddress,
  formatGuests,
  mapSearchUrl,
  PropertyHeader,
} from '@/features/public-property';
import {
  formatDate,
  formatDateTime,
  formatNights,
  formatTime,
  toApiDate,
} from '@/shared/lib/dates';
import { fileUrl } from '@/shared/lib/file-url';
import { formatMoney } from '@/shared/lib/money';
import { PUBLIC_AVAILABILITY_QUERY } from '@/shared/lib/public-query';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';
import { StatusBadge } from '@/shared/ui/status-badge';

import { GuestCancelDialog } from '../components/guest-cancel-dialog';

const STATUS_HEADLINES: Record<PublicReservationDto['status'], { title: string; text: string }> = {
  PENDING: {
    title: 'Czekamy na potwierdzenie gospodarza',
    text: 'Gospodarz sprawdza Twoją prośbę. Decyzję wyślemy e-mailem.',
  },
  CONFIRMED: {
    title: 'Twoja rezerwacja jest potwierdzona',
    text: 'Termin jest zarezerwowany dla Ciebie. Do zobaczenia!',
  },
  CANCELLED: {
    title: 'Rezerwacja została anulowana',
    text: 'Termin został zwolniony.',
  },
  EXPIRED: {
    title: 'Prośba o rezerwację wygasła',
    text: 'Gospodarz nie potwierdził jej na czas. Termin może być nadal wolny – sprawdź dostępność.',
  },
  COMPLETED: {
    title: 'Pobyt zakończony',
    text: 'Dziękujemy za pobyt i zapraszamy ponownie.',
  },
};

/**
 * P5 „Zarządzanie rezerwacją” (`/r/:token`, link z e-maila): status, szczegóły, kontakt i anulowanie
 * według BR-08. Token jest sekretem: nie trafia do tytułu, logów ani nagłówka `Referer`.
 */
export function GuestReservationPage() {
  const { token = '' } = useParams();
  const reservation = usePublicGetReservation(token, { query: PUBLIC_AVAILABILITY_QUERY });

  useDocumentMeta({
    title: reservation.data
      ? `Rezerwacja ${reservation.data.number} – ${reservation.data.property.name}`
      : 'Twoja rezerwacja',
    robots: 'noindex',
    referrer: 'no-referrer',
  });

  if (reservation.isPending) {
    return (
      <PublicLayout>
        <PublicContainer className="max-w-3xl py-10">
          <PageSkeleton rows={3} />
        </PublicContainer>
      </PublicLayout>
    );
  }

  if (reservation.isError) {
    return (
      <PublicLayout>
        <PublicContainer className="max-w-3xl py-16">
          {isApiError(reservation.error) && reservation.error.status === 404 ? (
            <EmptyState
              icon={<LinkIcon aria-hidden="true" />}
              title="Link jest nieaktualny"
              description="Rezerwacja nie istnieje albo link wygasł (30 dni po wyjeździe). Jeśli masz pytania, skontaktuj się z gospodarzem – numer rezerwacji znajdziesz w e-mailu."
            />
          ) : (
            <ErrorState
              error={reservation.error}
              title="Nie udało się wczytać rezerwacji"
              onRetry={() => void reservation.refetch()}
              retrying={reservation.isRefetching}
            />
          )}
        </PublicContainer>
      </PublicLayout>
    );
  }

  const data = reservation.data;
  return (
    <PublicLayout
      brandName={data.property.name}
      header={
        <PropertyHeader
          name={data.property.name}
          slug={data.property.slug}
          city={data.property.city}
          phone={data.property.phone}
          navigation={false}
        />
      }
    >
      <ReservationDetails reservation={data} token={token} />
    </PublicLayout>
  );
}

function ReservationDetails({
  reservation,
  token,
}: {
  reservation: PublicReservationDto;
  token: string;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const { property, room } = reservation;
  const headline = STATUS_HEADLINES[reservation.status];
  const address = formatAddress(property);
  const cover = room.coverPhoto;

  return (
    <PublicContainer className="grid max-w-3xl gap-6 py-6 lg:py-10">
      <section
        className="grid gap-3 rounded-xl border bg-card p-5 sm:p-6"
        aria-labelledby="reservation-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-md bg-background px-3 py-1.5 text-sm font-semibold tabular">
            {reservation.number}
          </p>
          <StatusBadge status={reservation.status} />
        </div>
        <h1 id="reservation-title" className="text-[1.625rem] leading-8 font-bold lg:text-headline">
          {headline.title}
        </h1>
        <p className="text-base text-muted-foreground">
          {headline.text}
          {reservation.status === 'CANCELLED' && reservation.cancelledAt && (
            <> Anulowano {formatDateTime(reservation.cancelledAt)}.</>
          )}
        </p>
        {reservation.status === 'EXPIRED' && (
          <Link
            to={routes.public.property(property.slug, 'termin')}
            className={buttonVariants({ variant: 'accent', className: 'justify-self-start' })}
          >
            Sprawdź dostępność
          </Link>
        )}
      </section>

      <section
        aria-label="Szczegóły pobytu"
        className="grid overflow-hidden rounded-xl border bg-card"
      >
        <div className="relative aspect-[16/7] bg-accent">
          {cover ? (
            <img
              src={fileUrl(cover.url)}
              alt={cover.altText ?? room.name}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-primary/40">
              <BedDouble className="size-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/75 to-transparent p-4">
            <p className="text-xs font-semibold text-card/90 uppercase">{property.name}</p>
            <h2 className="text-title text-card">{room.name}</h2>
          </div>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Detail
            icon={<CalendarDays aria-hidden="true" />}
            label={`Termin pobytu (${formatNights(reservation.nights)})`}
          >
            {formatDate(reservation.checkIn)} – {formatDate(reservation.checkOut)}
          </Detail>
          <Detail icon={<Users aria-hidden="true" />} label="Goście">
            {formatGuests(reservation.guestsCount)}
          </Detail>
          <Detail icon={<Clock aria-hidden="true" />} label="Zameldowanie">
            od {formatTime(property.checkInTime)}
          </Detail>
          <Detail icon={<Clock aria-hidden="true" />} label="Wymeldowanie">
            do {formatTime(property.checkOutTime)}
          </Detail>
          {reservation.guestNotes && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Twoje uwagi</dt>
              <dd className="text-base whitespace-pre-line">{reservation.guestNotes}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t pt-4 sm:col-span-2">
            <dt className="text-base font-semibold">Całkowity koszt pobytu</dt>
            <dd className="text-title-lg text-primary tabular">
              {formatMoney(reservation.totalPrice, reservation.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="contact-title" className="grid gap-4 rounded-xl border bg-card p-5">
        <h2 id="contact-title" className="text-title-sm">
          Kontakt z obiektem
        </h2>
        {address && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="grid">
              <p>{address}</p>
              <a
                href={mapSearchUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
              >
                Pokaż na mapie
                <span className="sr-only"> (otwiera się w nowej karcie)</span>
              </a>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {property.phone && (
            <a
              href={`tel:${property.phone.replace(/\s+/g, '')}`}
              className={buttonVariants({ variant: 'primary' })}
            >
              <Phone aria-hidden="true" />
              Zadzwoń
            </a>
          )}
          {property.contactEmail && (
            <a
              href={`mailto:${property.contactEmail}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Mail aria-hidden="true" />
              Napisz
            </a>
          )}
        </div>
      </section>

      <CancellationSection reservation={reservation} onCancel={() => setCancelOpen(true)} />

      <GuestCancelDialog
        token={token}
        number={reservation.number}
        pending={reservation.status === 'PENDING'}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </PublicContainer>
  );
}

/** BR-08: gość anuluje `PENDING` zawsze, `CONFIRMED` do `cancellableUntil` (liczy API: `canCancel`). */
function CancellationSection({
  reservation,
  onCancel,
}: {
  reservation: PublicReservationDto;
  onCancel: () => void;
}) {
  if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') return null;
  const until = reservation.cancellableUntil;
  const pending = reservation.status === 'PENDING';

  return (
    <section
      aria-labelledby="cancellation-title"
      className="grid gap-4 rounded-xl border bg-card p-5"
    >
      <h2 id="cancellation-title" className="text-title-sm">
        Zasady i anulowanie rezerwacji
      </h2>
      {reservation.canCancel ? (
        <>
          <p className="flex gap-3 rounded-md border border-success/20 bg-success-soft/60 p-4 text-base">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <span>
              {pending ? (
                <>
                  Możesz anulować prośbę, dopóki gospodarz jej nie potwierdzi.
                  {until && until >= toApiDate(new Date()) && (
                    <>
                      {' '}
                      Po potwierdzeniu bezpłatne anulowanie będzie możliwe do {formatDate(until)}.
                    </>
                  )}
                </>
              ) : until ? (
                <>Możesz bezpłatnie anulować rezerwację do {formatDate(until)}.</>
              ) : (
                <>Możesz bezpłatnie anulować rezerwację.</>
              )}
            </span>
          </p>
          <Button
            variant="destructive-outline"
            size="lg"
            className="w-full sm:w-auto sm:justify-self-start"
            onClick={onCancel}
          >
            <XCircle aria-hidden="true" />
            Anuluj rezerwację
          </Button>
        </>
      ) : (
        <p className="flex gap-3 rounded-md border border-warning/25 bg-warning-soft p-4 text-base text-warning">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem.
        </p>
      )}
    </section>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-base font-semibold tabular">{children}</dd>
      </div>
    </div>
  );
}
