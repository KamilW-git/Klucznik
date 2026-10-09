import type { PhotoDto, PublicRoomDto } from '@klucznik/api-client';
import { CalendarDays, Clock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { PublicContainer } from '@/app/layouts/public-layout';
import { PROPERTY_SECTIONS } from '@/app/routes';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/dates';
import { fileUrl } from '@/shared/lib/file-url';
import { formatMoney } from '@/shared/lib/money';
import { useDocumentMeta } from '@/shared/lib/use-document-meta';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/states';

import { PhotoGrid } from '../components/photo-grid';
import { PhotoLightbox } from '../components/photo-lightbox';
import { RoomCard } from '../components/room-card';
import { RoomDatesDialog } from '../components/room-dates-dialog';
import { StaySearchForm } from '../components/stay-search-form';
import {
  formatAddress,
  formatCancellationPolicy,
  formatConfirmationTime,
  mapSearchUrl,
} from '../policy';
import { usePublicProperty } from '../property-context';

interface Gallery {
  title: string;
  photos: readonly PhotoDto[];
  index: number;
}

/** Opis do meta `description`: pierwsze zdanie(a) opisu obiektu, maks. ~160 znaków. */
function metaDescription(description: string | null, fallback: string): string {
  const text = (description ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/** Przewija do pola terminu i otwiera na nim fokus (sticky „Sprawdź dostępność” na telefonie). */
function focusSearch() {
  const search = document.getElementById(PROPERTY_SECTIONS.search);
  search?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  search?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
}

/**
 * P1 „Strona obiektu” (guest-booking.md): hero z wyszukiwarką, o nas, pokoje z ceną „od”,
 * galeria, lokalizacja z godzinami i zasadami, kontakt. Mobile-first, sticky „Sprawdź dostępność”.
 */
export function PropertyPage() {
  const property = usePublicProperty();
  const location = useLocation();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [datesRoom, setDatesRoom] = useState<PublicRoomDto | null>(null);
  const cover = property.photos[0];
  const address = formatAddress(property);
  const maxGuests = Math.max(1, ...property.rooms.map((room) => room.capacity));

  useDocumentMeta({
    title: property.city ? `${property.name} – ${property.city}` : property.name,
    description: metaDescription(
      property.description,
      `${property.name}: sprawdź wolne terminy i zarezerwuj pobyt bezpośrednio u gospodarza.`,
    ),
  });

  // Kotwice z nawigacji nagłówka (`/o/:slug#pokoje`), także przy wejściu z innej strony obiektu.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className="pb-24 lg:pb-0">
      <section
        aria-labelledby="property-name"
        className="relative isolate overflow-hidden bg-primary text-primary-foreground"
      >
        {cover && (
          <>
            <img
              src={fileUrl(cover.url)}
              alt=""
              className="absolute inset-0 -z-20 size-full object-cover"
            />
            <div
              className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/70 via-foreground/45 to-foreground/70"
              aria-hidden="true"
            />
          </>
        )}
        <PublicContainer className="grid gap-8 py-12 lg:py-20">
          <div className="grid max-w-3xl gap-3">
            {property.city && (
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4" aria-hidden="true" />
                {property.city}
              </p>
            )}
            <h1
              id="property-name"
              className="text-[2.125rem] leading-[2.625rem] font-bold tracking-[-0.01em] lg:text-display"
            >
              {property.name}
            </h1>
          </div>
          <div
            id={PROPERTY_SECTIONS.search}
            className="scroll-mt-24 rounded-xl bg-card p-5 text-card-foreground shadow-overlay sm:p-6"
          >
            <StaySearchForm slug={property.slug} maxGuests={maxGuests} />
          </div>
        </PublicContainer>
      </section>

      <PublicContainer className="grid grid-cols-1 gap-16 py-12 lg:py-16">
        {property.description && (
          <Section id={PROPERTY_SECTIONS.about} title="O nas">
            <p className="max-w-3xl text-base whitespace-pre-line text-muted-foreground">
              {property.description}
            </p>
          </Section>
        )}

        <Section id={PROPERTY_SECTIONS.rooms} title="Pokoje i domki">
          {property.rooms.length === 0 ? (
            <EmptyState
              title="Brak pokoi do rezerwacji"
              description="Obiekt nie udostępnia teraz pokoi do rezerwacji online. Skontaktuj się z gospodarzem."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {property.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onShowPhotos={() =>
                    setGallery({ title: room.name, photos: room.photos, index: 0 })
                  }
                  price={
                    <p className="grid">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Cena od
                      </span>
                      <span className="text-title-sm text-foreground tabular">
                        {formatMoney(room.priceFrom, property.currency)}
                        <span className="text-sm font-normal text-muted-foreground"> / noc</span>
                      </span>
                    </p>
                  }
                  actions={
                    <Button onClick={() => setDatesRoom(room)}>
                      <CalendarDays aria-hidden="true" />
                      Zobacz terminy
                      <span className="sr-only">: {room.name}</span>
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </Section>

        {property.photos.length > 0 && (
          <Section id={PROPERTY_SECTIONS.gallery} title="Galeria">
            <PhotoGrid
              photos={property.photos}
              title={property.name}
              onOpen={(index) =>
                setGallery({ title: property.name, photos: property.photos, index })
              }
            />
          </Section>
        )}

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-8">
          <Section id={PROPERTY_SECTIONS.location} title="Lokalizacja i zasady">
            <div className="grid gap-4 rounded-lg border bg-card p-5">
              {address && (
                <InfoRow icon={<MapPin aria-hidden="true" />} label="Adres">
                  <p>{address}</p>
                  <a
                    href={mapSearchUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    Pokaż na mapie
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                  </a>
                </InfoRow>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={<Clock aria-hidden="true" />} label="Zameldowanie">
                  od {formatTime(property.checkInTime)}
                </InfoRow>
                <InfoRow icon={<Clock aria-hidden="true" />} label="Wymeldowanie">
                  do {formatTime(property.checkOutTime)}
                </InfoRow>
              </div>
              <InfoRow icon={<ShieldCheck aria-hidden="true" />} label="Rezerwacja">
                <p>{formatCancellationPolicy(property.cancellationDeadlineDays)}.</p>
                <p>
                  Gospodarz potwierdza prośbę o rezerwację{' '}
                  {formatConfirmationTime(property.pendingExpiryHours)}.
                </p>
              </InfoRow>
            </div>
          </Section>

          <Section id={PROPERTY_SECTIONS.contact} title="Kontakt">
            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-5">
              <p className="text-base text-muted-foreground">
                Masz pytania przed przyjazdem? Skontaktuj się bezpośrednio z gospodarzem.
              </p>
              {property.phone || property.contactEmail ? (
                <div className="flex flex-wrap gap-3">
                  {property.phone && (
                    <a
                      href={`tel:${property.phone.replace(/\s+/g, '')}`}
                      className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover"
                    >
                      <Phone className="size-5" aria-hidden="true" />
                      {property.phone}
                    </a>
                  )}
                  {property.contactEmail && (
                    <a
                      href={`mailto:${property.contactEmail}`}
                      className="inline-flex h-12 max-w-full min-w-0 items-center gap-2 rounded-md border-[1.5px] border-primary/25 px-5 font-semibold text-primary hover:border-primary"
                    >
                      <Mail className="size-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{property.contactEmail}</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Obiekt nie podał danych kontaktowych.
                </p>
              )}
            </div>
          </Section>
        </div>
      </PublicContainer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur lg:hidden">
        <Button variant="accent" size="lg" className="w-full" onClick={focusSearch}>
          <CalendarDays aria-hidden="true" />
          Sprawdź dostępność
        </Button>
      </div>

      <PhotoLightbox
        photos={gallery?.photos ?? []}
        title={gallery?.title ?? ''}
        index={gallery?.index ?? null}
        onIndexChange={(index) =>
          setGallery((current) => (current && index !== null ? { ...current, index } : null))
        }
      />
      <RoomDatesDialog slug={property.slug} room={datesRoom} onClose={() => setDatesRoom(null)} />
    </div>
  );
}

function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('grid scroll-mt-24 grid-cols-1 gap-6', className)}
    >
      <h2 id={`${id}-title`} className="text-[1.625rem] leading-8 font-bold lg:text-headline">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({
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
      <div className="grid min-w-0 gap-0.5 text-base">
        <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  );
}
