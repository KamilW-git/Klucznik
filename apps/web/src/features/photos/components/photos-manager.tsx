import { arrayMove } from '@dnd-kit/sortable';
import { usePhotosRemove, usePhotosUpdate, type PhotoDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { invalidatePaths } from '@/shared/lib/invalidate';
import { notifyError, notifySuccess } from '@/shared/lib/notify';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

import { MAX_PHOTOS, usePhotoUpload, type PhotoTarget } from '../hooks/use-photo-upload';
import { PhotoGallery } from './photo-gallery';
import { PhotoUploader } from './photo-uploader';

interface PhotosManagerProps {
  target: PhotoTarget;
  /** Zdjęcia z `RoomDto.photos` / `PropertyDto.photos` (kolejność `sortOrder`). */
  photos: readonly PhotoDto[];
  fallbackAlt: string;
}

/**
 * Zdjęcia pokoju (O7) lub obiektu (O8): wysyłka, kolejność (optymistycznie, data-and-auth.md),
 * opis i usuwanie. Po zmianach odświeża dane pokoju / obiektu.
 */
export function PhotosManager({ target, photos, fallbackAlt }: PhotosManagerProps) {
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () =>
      void invalidatePaths(queryClient, [
        target.kind === 'room'
          ? /^\/api\/v1\/(rooms\/|properties\/[^/]+\/rooms$)/
          : /^\/api\/v1\/properties/,
      ]),
    [queryClient, target.kind],
  );
  const upload = usePhotoUpload(target, refresh);
  const [order, setOrder] = useState<readonly PhotoDto[] | null>(null);
  const [lastPhotos, setLastPhotos] = useState(photos);
  const [deleting, setDeleting] = useState<PhotoDto | null>(null);

  // Świeże dane z serwera zastępują lokalną (optymistyczną) kolejność.
  if (photos !== lastPhotos) {
    setLastPhotos(photos);
    setOrder(null);
  }
  const shown = order ?? photos;

  const update = usePhotosUpdate({
    mutation: {
      onError: (error) => {
        setOrder(null);
        notifyError(error, 'Nie udało się zapisać zmiany zdjęcia');
      },
      onSettled: refresh,
    },
  });
  const remove = usePhotosRemove({
    mutation: {
      onSuccess: () => {
        notifySuccess('Usunięto zdjęcie');
        setDeleting(null);
      },
      onError: (error) => notifyError(error, 'Nie udało się usunąć zdjęcia'),
      onSettled: refresh,
    },
  });

  return (
    <div className="grid gap-6">
      <PhotoUploader
        items={upload.items}
        onFiles={(files) => upload.addFiles(files, MAX_PHOTOS - photos.length)}
        onDismiss={upload.dismiss}
        slotsLeft={MAX_PHOTOS - photos.length}
      />
      {shown.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <ImagePlus className="size-5" aria-hidden="true" />
          Brak zdjęć. Dodaj co najmniej jedno – goście chętniej rezerwują z galerią.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {shown.length} z {MAX_PHOTOS} zdjęć. Przeciągnij uchwyt, aby zmienić kolejność; opis
            zapisuje się po wyjściu z pola.
          </p>
          <PhotoGallery
            photos={shown}
            fallbackAlt={fallbackAlt}
            onMove={(photo, toIndex) => {
              const from = shown.findIndex((item) => item.id === photo.id);
              setOrder(arrayMove([...shown], from, toIndex));
              update.mutate({ id: photo.id, data: { sortOrder: toIndex } });
            }}
            onAltTextSave={(photo, altText) =>
              update.mutate(
                { id: photo.id, data: { altText } },
                { onSuccess: () => notifySuccess('Zapisano opis zdjęcia') },
              )
            }
            onDelete={setDeleting}
          />
        </>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Usunąć zdjęcie?"
        description="Zdjęcie zniknie z galerii i strony obiektu."
        confirmLabel="Usuń zdjęcie"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })}
      />
    </div>
  );
}
