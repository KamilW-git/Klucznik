import type { PublicRoomDto } from '@klucznik/api-client';
import { BedDouble, Images, MoonStar, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { formatNights, pluralize } from '@/shared/lib/dates';
import { fileUrl } from '@/shared/lib/file-url';

interface RoomCardProps {
  room: PublicRoomDto;
  /** `horizontal`: zdjęcie obok treści od `md` (P2); `vertical`: karta w siatce (P1). */
  orientation?: 'vertical' | 'horizontal';
  /** Pokój niedostępny w wybranym terminie (przygaszony, P2). */
  dimmed?: boolean;
  /** Etykieta na zdjęciu (np. „Niedostępny w tych dniach”). */
  badge?: ReactNode;
  /** Komunikaty pod opisem (powód niedostępności, minimalny pobyt). */
  notice?: ReactNode;
  /** Blok ceny („od 380 zł / noc”, „1 640 zł za 4 noce”). */
  price: ReactNode;
  actions: ReactNode;
  onShowPhotos?: () => void;
}

/** Karta pokoju strony publicznej: zdjęcie, pojemność, minimalny pobyt, opis, cena, akcje (Q-20: bez udogodnień). */
export function RoomCard({
  room,
  orientation = 'vertical',
  dimmed,
  badge,
  notice,
  price,
  actions,
  onShowPhotos,
}: RoomCardProps) {
  const cover = room.photos[0];
  const horizontal = orientation === 'horizontal';
  const photosCount = room.photos.length;

  return (
    <article
      aria-label={room.name}
      className={cn(
        'grid overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-raised',
        horizontal && 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
        dimmed && 'bg-muted/60',
      )}
    >
      <div
        className={cn(
          'relative aspect-[4/3] bg-accent',
          horizontal && 'md:aspect-auto md:min-h-60',
        )}
      >
        {cover ? (
          <img
            src={fileUrl(cover.url)}
            alt={cover.altText ?? room.name}
            loading="lazy"
            className={cn('absolute inset-0 size-full object-cover', dimmed && 'grayscale')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/40">
            <BedDouble className="size-12" aria-hidden="true" />
          </div>
        )}
        {badge && <div className="absolute top-3 left-3">{badge}</div>}
        {onShowPhotos && photosCount > 0 && (
          <button
            type="button"
            onClick={onShowPhotos}
            className="absolute right-3 bottom-3 flex h-9 items-center gap-1.5 rounded-full bg-foreground/75 px-3 text-xs font-semibold text-card hover:bg-foreground"
          >
            <Images className="size-4" aria-hidden="true" />
            {photosCount} {pluralize(photosCount, 'zdjęcie', 'zdjęcia', 'zdjęć')}
            <span className="sr-only">: {room.name}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-2">
          <h3 className={cn('text-title text-foreground', dimmed && 'text-muted-foreground')}>
            {room.name}
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              do {room.capacity} {pluralize(room.capacity, 'osoby', 'osób', 'osób')}
            </li>
            {room.minNights > 1 && (
              <li className="flex items-center gap-1.5">
                <MoonStar className="size-4" aria-hidden="true" />
                min. {formatNights(room.minNights)}
              </li>
            )}
          </ul>
        </div>
        {room.description && (
          <p className="line-clamp-3 text-base text-muted-foreground">{room.description}</p>
        )}
        {notice}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="min-w-0">{price}</div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      </div>
    </article>
  );
}
