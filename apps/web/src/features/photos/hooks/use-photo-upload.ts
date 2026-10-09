import { photosUploadForProperty, photosUploadForRoom, type PhotoDto } from '@klucznik/api-client';
import { useCallback, useRef, useState } from 'react';

import { getErrorMessage } from '@/shared/lib/api-errors';

/** Galeria obiektu albo pokoju. */
export type PhotoTarget = { kind: 'property' | 'room'; id: string };

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  key: string;
  name: string;
  status: UploadStatus;
  error: string | null;
}

/** Limity Q-14 (photos.md): JPG, PNG, WebP do 10 MB, 20 zdjęć w galerii. */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS = 20;
const CONCURRENCY = 3;

/** Walidacja po stronie klienta (API sprawdza to samo: 413, 415, 422). */
export function validateFile(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Nieobsługiwany typ pliku. Dodaj zdjęcie JPG, PNG lub WebP.';
  }
  if (file.size > MAX_FILE_BYTES) return 'Plik jest za duży (maks. 10 MB).';
  return null;
}

function upload(target: PhotoTarget, file: File): Promise<PhotoDto> {
  return target.kind === 'room'
    ? photosUploadForRoom(target.id, { file })
    : photosUploadForProperty(target.id, { file });
}

/**
 * Kolejka wysyłki: jeden plik = jedno żądanie, maks. 3 równolegle (photos.md). `fetch` nie raportuje
 * postępu wysyłki, więc stan per plik to: w kolejce / wysyłanie / gotowe / błąd.
 */
export function usePhotoUpload(target: PhotoTarget, onUploaded: () => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<{ key: string; file: File }[]>([]);
  const running = useRef(0);

  const patch = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }, []);

  const pump = useCallback(() => {
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const next = queue.current.shift();
      if (!next) break;
      running.current += 1;
      patch(next.key, { status: 'uploading' });
      upload(target, next.file)
        .then(() => {
          patch(next.key, { status: 'done' });
          onUploaded();
        })
        .catch((error: unknown) =>
          patch(next.key, { status: 'error', error: getErrorMessage(error) }),
        )
        .finally(() => {
          running.current -= 1;
          pump();
        });
    }
  }, [target, onUploaded, patch]);

  /** Dodaje pliki; odrzucone lokalnie (typ, rozmiar, limit galerii) od razu mają błąd. */
  const addFiles = useCallback(
    (files: readonly File[], slotsLeft: number) => {
      let slots = slotsLeft - queue.current.length - running.current;
      const added: UploadItem[] = files.map((file, index) => {
        const key = `${Date.now()}-${index}-${file.name}`;
        const invalid =
          validateFile(file) ??
          (slots <= 0 ? `Galeria może mieć najwyżej ${MAX_PHOTOS} zdjęć.` : null);
        if (invalid) return { key, name: file.name, status: 'error', error: invalid };
        slots -= 1;
        queue.current.push({ key, file });
        return { key, name: file.name, status: 'queued', error: null };
      });
      setItems((current) => [...current.filter((item) => item.status !== 'done'), ...added]);
      pump();
    },
    [pump],
  );

  const dismiss = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  return { items, addFiles, dismiss };
}
