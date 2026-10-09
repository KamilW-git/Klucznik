import {
  usePublicAvailability,
  type PhotoDto,
  type PublicRoomDto,
  type RoomAvailabilityDto,
} from '@klucznik/api-client';
import { addDays } from 'date-fns';
import { ArrowRight, CalendarDays, CalendarSearch, SlidersHorizontal, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { PublicContainer } from '@/app/layouts/public-layout';
import { routes } from '@/app/routes';
import { getErrorMessage } from '@/shared/lib/api-errors';
import {
  formatDate,
  formatNights,
  nightsBetween,
  parseApiDate,
  pluralize,
  toApiDate,
} from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { PUBLIC_AVAILABILITY_QUERY } from '@/shared/lib/public-query';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState, PageSkeleton } from '@/shared/ui/states';

import { OccupancyMiniCalendar } from '../components/occupancy-mini-calendar';
import { PhotoLightbox } from '../components/photo-lightbox';
import { RoomCard } from '../components/room-card';
import { RoomDatesDialog } from '../components/room-dates-dialog';
import { StaySearchForm } from '../components/stay-search-form';
import { formatCancellationPolicy } from '../policy';
import { usePublicProperty } from '../property-context';
import { formatGuests, parseStaySearch, type StaySearch } from '../stay-search';

/**
 * P2 „Wyniki dostępności” (`/o/:slug/dostepnosc?checkIn&checkOut&guests`): wszystkie aktywne pokoje
 * z ceną za cały pobyt albo powodem niedostępności (Q-17). Cenę i dostępność liczy API.
 */
export function AvailabilityPage() {
  const property = usePublicProperty();
  const [params] = useSearchParams();
  const search = parseStaySearch(params);
  const [editing, setEditing] = useState(false);
  const maxGuests = Math.max(1, ...property.rooms.map((room) => room.capacity));

  useDocumentMeta({
    title: `Dostępność – ${property.name}`,
    description: `Wolne pokoje i ceny w obiekcie ${property.name}.`,
  });

  if (!search) {
    return (
      <PublicContainer className="grid max-w-4xl gap-6 py-10">
        <h1 className="text-[1.625rem] leading-8 font-bold lg:text-headline">Sprawdź dostępność</h1>
        <Alert variant="info" title="Wybierz termin pobytu i liczbę gości">
          Pokażemy wolne pokoje z ceną za cały pobyt.
        </Alert>
        <div className="rounded-lg border bg-card p-5">
          <StaySearchForm slug={property.slug} maxGuests={maxGuests} />
        </div>
      </PublicContainer>
    );
  }

  return (
    <PublicContainer className="grid gap-6 py-6 lg:py-10">
      <section
        aria-label="Wyszukiwany pobyt"
        className="grid gap-4 rounded-lg border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <SummaryItem icon={<CalendarDays aria-hidden="true" />} label="Termin pobytu">
            {formatDate(search.checkIn)} – {formatDate(search.checkOut)}{' '}
            <span className="font-normal text-muted-foreground">
              ({formatNights(nightsOf(search))})
            </span>
          </SummaryItem>
          <SummaryItem icon={<Users aria-hidden="true" />} label="Liczba gości">
            {formatGuests(search.guests)}
          </SummaryItem>
          <Button
            variant="outline"
            className="sm:ml-auto"
            aria-expanded={editing}
            aria-controls="change-search"
            onClick={() => setEditing((value) => !value)}
          >
            <SlidersHorizontal aria-hidden="true" />
            {editing ? 'Zwiń' : 'Zmień'}
          </Button>
        </div>
        {editing && (
          <div id="change-search" className="border-t pt-4">
            <StaySearchForm
              key={`${search.checkIn}-${search.checkOut}-${search.guests}`}
              slug={property.slug}
              maxGuests={maxGuests}
              initial={search}
              onSearched={() => setEditing(false)}
            />
          </div>
        )}
      </section>

      <AvailabilityResults search={search} onChangeSearch={() => setEditing(true)} />
    </PublicContainer>
  );
}

function nightsOf(search: StaySearch): number {
  return nightsBetween(search.checkIn, search.checkOut);
}

function AvailabilityResults({
  search,
  onChangeSearch,
}: {
  search: StaySearch;
  onChangeSearch: () => void;
}) {
  const property = usePublicProperty();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<{ title: string; photos: readonly PhotoDto[] } | null>(
    null,
  );
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [datesRoom, setDatesRoom] = useState<PublicRoomDto | null>(null);
  const availability = usePublicAvailability(property.slug, search, {
    query: { ...PUBLIC_AVAILABILITY_QUERY, retry: false },
  });

  if (availability.isPending) return <PageSkeleton rows={3} />;

  if (availability.isError) {
    return (
      <Alert
        title={getErrorMessage(availability.error)}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onChangeSearch}>
              Zmień termin
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void availability.refetch()}>
              Spróbuj ponownie
            </Button>
          </div>
        }
      />
    );
  }

  const result = availability.data;
  // Dostępne najpierw; kolejność API (po nazwie) w obrębie grup.
  const rooms = [...result.rooms].sort((a, b) => Number(b.available) - Number(a.available));
  const availableCount = rooms.filter((item) => item.available).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-5">
        <div className="grid gap-1">
          <h1 className="text-[1.625rem] leading-8 font-bold lg:text-headline">
            Dostępne pokoje{' '}
            <span className="text-title font-normal text-muted-foreground">
              ({availableCount} z {rooms.length})
            </span>
          </h1>
          <p className="text-base text-muted-foreground">
            Ceny to łączna kwota za cały pobyt: {formatNights(result.nights)},{' '}
            {formatGuests(result.guests)}.
          </p>
        </div>

        {availableCount === 0 && (
          <EmptyState
            icon={<CalendarSearch aria-hidden="true" />}
            title="Brak wolnych pokoi w wybranym terminie – spróbuj innych dat"
            description={
              property.phone
                ? `Możesz też zapytać gospodarza o inne możliwości: ${property.phone}.`
                : undefined
            }
            actions={<Button onClick={onChangeSearch}>Zmień termin</Button>}
          />
        )}

        {rooms.map((item) => (
          <RoomResult
            key={item.room.id}
            item={item}
            search={search}
            currency={result.currency}
            onShowPhotos={() => {
              setGallery({ title: item.room.name, photos: item.room.photos });
              setGalleryIndex(0);
            }}
            onShowDates={() => setDatesRoom(item.room)}
            onExtend={(nights) =>
              void navigate(
                routes.public.availability(property.slug, {
                  ...search,
                  checkOut: toApiDate(addDays(parseApiDate(search.checkIn), nights)),
                }),
              )
            }
          />
        ))}
      </div>

      <aside className="grid content-start gap-5" aria-label="Informacje o rezerwacji">
        <div className="hidden lg:block">
          <OccupancyMiniCalendar slug={property.slug} rooms={property.rooms} search={search} />
        </div>
        <div className="grid gap-2 rounded-lg border bg-accent p-5 text-sm">
          <p className="text-base font-semibold text-foreground">
            Rezerwacja bezpośrednio u gospodarza
          </p>
          <p>{formatCancellationPolicy(property.cancellationDeadlineDays)}.</p>
          <p>Płatność ustalasz z gospodarzem – wysłanie prośby niczego nie pobiera.</p>
        </div>
      </aside>

      <PhotoLightbox
        photos={gallery?.photos ?? []}
        title={gallery?.title ?? ''}
        index={galleryIndex}
        onIndexChange={setGalleryIndex}
      />
      <RoomDatesDialog
        slug={property.slug}
        room={datesRoom}
        onClose={() => setDatesRoom(null)}
        initialGuests={search.guests}
      />
    </div>
  );
}

function RoomResult({
  item,
  search,
  currency,
  onShowPhotos,
  onShowDates,
  onExtend,
}: {
  item: RoomAvailabilityDto;
  search: StaySearch;
  currency: string;
  onShowPhotos: () => void;
  onShowDates: () => void;
  onExtend: (nights: number) => void;
}) {
  const property = usePublicProperty();
  const { room } = item;

  if (item.available && item.totalPrice !== null) {
    return (
      <RoomCard
        room={room}
        orientation="horizontal"
        onShowPhotos={onShowPhotos}
        price={
          <p className="grid">
            <span className="text-title-lg text-foreground tabular">
              {formatMoney(item.totalPrice, currency)}{' '}
              <span className="text-base font-normal text-muted-foreground">
                za {formatNights(nightsOf(search))}
              </span>
            </span>
            {item.averagePricePerNight !== null && (
              <span className="text-sm text-muted-foreground tabular">
                (średnio {formatMoney(item.averagePricePerNight, currency)} / noc)
              </span>
            )}
          </p>
        }
        actions={
          <Link
            to={routes.public.booking(property.slug, room.id, search)}
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            Wybierz
            <span className="sr-only">: {room.name}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  const minNights = item.unavailableReason === 'MIN_NIGHTS_NOT_MET';
  return (
    <RoomCard
      room={room}
      orientation="horizontal"
      dimmed={!minNights}
      onShowPhotos={onShowPhotos}
      badge={
        <span className="rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-foreground">
          {minNights
            ? `Minimalny pobyt: ${formatNights(item.minNights)}`
            : 'Niedostępny w tych dniach'}
        </span>
      }
      notice={
        <p
          className={
            minNights
              ? 'rounded-md border border-warning/25 bg-warning-soft p-3 text-sm text-warning'
              : 'rounded-md bg-card p-3 text-sm text-muted-foreground'
          }
        >
          {unavailableText(item, search)}
        </p>
      }
      price={
        <p className="text-sm text-muted-foreground italic">Niedostępny dla podanych kryteriów</p>
      }
      actions={
        minNights ? (
          <Button variant="outline" onClick={() => onExtend(item.minNights)}>
            Wydłuż pobyt do {formatNights(item.minNights)}
          </Button>
        ) : (
          <Button variant="outline" onClick={onShowDates}>
            <CalendarDays aria-hidden="true" />
            Sprawdź terminy pokoju
            <span className="sr-only">: {room.name}</span>
          </Button>
        )
      }
    />
  );
}

function unavailableText(item: RoomAvailabilityDto, search: StaySearch): string {
  switch (item.unavailableReason) {
    case 'CAPACITY_EXCEEDED':
      return `Pokój mieści do ${item.room.capacity} os., a szukasz miejsca dla ${search.guests} ${pluralize(search.guests, 'osoby', 'osób', 'osób')}.`;
    case 'MIN_NIGHTS_NOT_MET':
      return `W tym terminie minimalny pobyt to ${formatNights(item.minNights)}. Wydłuż pobyt albo wybierz inne daty.`;
    default:
      return 'Pokój jest zajęty w wybranym terminie. Sprawdź inne terminy.';
  }
}

function SummaryItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div className="grid">
        <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
        <span className="text-base font-semibold text-foreground tabular">{children}</span>
      </div>
    </div>
  );
}
