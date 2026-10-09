import type { PhotoDto } from '@klucznik/api-client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { fileUrl } from '@/shared/lib/file-url';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';

interface PhotoLightboxProps {
  photos: readonly PhotoDto[];
  /** Nazwa galerii („Domek Sosna”, nazwa obiektu). */
  title: string;
  /** Otwarte zdjęcie; `null` zamyka podgląd. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

/** Podgląd zdjęć galerii: strzałki (także klawiatura ← →), licznik, tekst alternatywny jako podpis. */
export function PhotoLightbox({ photos, title, index, onIndexChange }: PhotoLightboxProps) {
  const count = photos.length;
  const current = index === null ? undefined : photos[index];
  const go = (delta: number) => {
    if (index === null || count === 0) return;
    onIndexChange((index + delta + count) % count);
  };

  return (
    <Dialog open={current !== undefined} onOpenChange={(open) => !open && onIndexChange(null)}>
      {current && index !== null && (
        <DialogContent
          size="xl"
          title={title}
          description={`Zdjęcie ${index + 1} z ${count}`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') go(-1);
            if (event.key === 'ArrowRight') go(1);
          }}
        >
          <figure className="grid gap-3">
            <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted">
              <img
                src={fileUrl(current.url)}
                alt={current.altText ?? `${title} – zdjęcie ${index + 1}`}
                className="max-h-[65dvh] w-full object-contain"
              />
            </div>
            {current.altText && (
              <figcaption className="text-sm text-muted-foreground">{current.altText}</figcaption>
            )}
          </figure>
          {count > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => go(-1)}>
                <ChevronLeft aria-hidden="true" />
                Poprzednie
              </Button>
              <span className="text-sm text-muted-foreground tabular" aria-hidden="true">
                {index + 1} / {count}
              </span>
              <Button variant="outline" onClick={() => go(1)}>
                Następne
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
