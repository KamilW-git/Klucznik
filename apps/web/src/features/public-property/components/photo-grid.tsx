import type { PhotoDto } from '@klucznik/api-client';

import { cn } from '@/shared/lib/cn';
import { fileUrl } from '@/shared/lib/file-url';

interface PhotoGridProps {
  photos: readonly PhotoDto[];
  /** Nazwa galerii do tekstów alternatywnych bez opisu. */
  title: string;
  onOpen: (index: number) => void;
  /** Ile miniatur pokazać; ostatnia ma nakładkę „+N”. */
  limit?: number;
}

/** Galeria obiektu (P1): siatka miniatur otwierających `PhotoLightbox`. */
export function PhotoGrid({ photos, title, onOpen, limit = 8 }: PhotoGridProps) {
  const visible = photos.slice(0, limit);
  const hidden = photos.length - visible.length;

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {visible.map((photo, index) => {
        const alt = photo.altText ?? `${title} – zdjęcie ${index + 1}`;
        const more = hidden > 0 && index === visible.length - 1;
        return (
          <li key={photo.id} className={cn(index === 0 && 'col-span-2 row-span-2')}>
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-muted"
              aria-label={more ? `Pokaż wszystkie zdjęcia (${photos.length})` : `Powiększ: ${alt}`}
            >
              <img
                src={fileUrl(photo.url)}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform group-hover:scale-[1.03]"
              />
              {more && (
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-title text-card">
                  +{hidden}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
