import { CalendarDays, Phone } from 'lucide-react';
import { Link } from 'react-router';

import { PublicContainer } from '@/app/layouts/public-layout';
import { PROPERTY_SECTIONS, routes } from '@/app/routes';
import { cn } from '@/shared/lib/cn';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Skeleton } from '@/shared/ui/skeleton';

interface PropertyHeaderProps {
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  /** Nawigacja po sekcjach strony obiektu i „Zarezerwuj” (P1–P4); P5 ma tylko markę i telefon. */
  navigation?: boolean;
}

const NAV_ITEMS = [
  { label: 'Pokoje', section: PROPERTY_SECTIONS.rooms },
  { label: 'O nas', section: PROPERTY_SECTIONS.about },
  { label: 'Lokalizacja', section: PROPERTY_SECTIONS.location },
  { label: 'Kontakt', section: PROPERTY_SECTIONS.contact },
] as const;

/** Inicjały marki obiektu („Domki Leśna Polana” → „DL”). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Nagłówek white-label: marka obiektu (nie Klucznika), telefon, przejście do rezerwacji. */
export function PropertyHeader({
  name,
  slug,
  city,
  phone,
  navigation = true,
}: PropertyHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <PublicContainer className="flex h-16 items-center gap-4">
        <Link
          to={routes.public.property(slug)}
          className="flex min-w-0 items-center gap-3 rounded-md"
          aria-label={`${name} – strona główna obiektu`}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(name)}
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-base font-bold text-foreground">{name}</span>
            {city && <span className="truncate text-xs text-muted-foreground">{city}</span>}
          </span>
        </Link>

        {navigation && (
          <nav aria-label="Sekcje strony obiektu" className="mx-auto hidden lg:block">
            <ul className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.section}>
                  <Link
                    to={routes.public.property(slug, item.section)}
                    className="flex h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={cn('flex shrink-0 items-center gap-2', !navigation && 'ml-auto')}>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-primary hover:bg-accent"
              aria-label={`Zadzwoń: ${phone}`}
            >
              <Phone className="size-5" aria-hidden="true" />
              <span className="hidden md:inline">{phone}</span>
            </a>
          )}
          {navigation && (
            <Link
              to={routes.public.property(slug, PROPERTY_SECTIONS.search)}
              className={cn(
                buttonVariants({ variant: 'primary', size: 'md' }),
                'hidden sm:inline-flex',
              )}
            >
              <CalendarDays aria-hidden="true" />
              Zarezerwuj
            </Link>
          )}
        </div>
      </PublicContainer>
    </header>
  );
}

/** Nagłówek w trakcie ładowania obiektu. */
export function PropertyHeaderSkeleton() {
  return (
    <header className="border-b bg-card">
      <PublicContainer className="flex h-16 items-center gap-3">
        <Skeleton className="size-10 rounded-md" />
        <Skeleton className="h-5 w-48" />
      </PublicContainer>
    </header>
  );
}
