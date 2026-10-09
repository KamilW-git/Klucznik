import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PhotoDto } from '@klucznik/api-client';
import { GripVertical, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { fileUrl } from '@/shared/lib/file-url';
import { Button } from '@/shared/ui/button';

interface PhotoGalleryProps {
  photos: readonly PhotoDto[];
  /** Nazwa obiektu / pokoju jako zastępczy `alt`. */
  fallbackAlt: string;
  onMove: (photo: PhotoDto, toIndex: number) => void;
  onAltTextSave: (photo: PhotoDto, altText: string | null) => void;
  onDelete: (photo: PhotoDto) => void;
  disabled?: boolean;
}

/**
 * Siatka zdjęć z przeciąganiem (dnd-kit: mysz, dotyk i klawiatura: Spacja + strzałki).
 * Pozycja 0 to „Zdjęcie główne” (photos.md).
 */
export function PhotoGallery({
  photos,
  fallbackAlt,
  onMove,
  onAltTextSave,
  onDelete,
  disabled,
}: PhotoGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((photo) => photo.id === active.id);
    const to = photos.findIndex((photo) => photo.id === over.id);
    const photo = photos[from];
    if (photo && to >= 0) onMove(photo, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Aby zmienić kolejność, naciśnij Spację, przesuń strzałkami i naciśnij Spację ponownie. Escape anuluje.',
        },
        announcements: {
          onDragStart: ({ active }) => `Podniesiono zdjęcie ${position(photos, active.id)}.`,
          onDragOver: ({ over }) =>
            over ? `Nad pozycją ${position(photos, over.id)}.` : undefined,
          onDragEnd: ({ over }) =>
            over ? `Upuszczono na pozycji ${position(photos, over.id)}.` : 'Anulowano.',
          onDragCancel: () => 'Anulowano przenoszenie.',
        },
      }}
    >
      <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <SortablePhoto
              key={photo.id}
              photo={photo}
              index={index}
              fallbackAlt={fallbackAlt}
              onAltTextSave={onAltTextSave}
              onDelete={onDelete}
              disabled={disabled}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function position(photos: readonly PhotoDto[], id: string | number): number {
  return photos.findIndex((photo) => photo.id === id) + 1;
}

function SortablePhoto({
  photo,
  index,
  fallbackAlt,
  onAltTextSave,
  onDelete,
  disabled,
}: {
  photo: PhotoDto;
  index: number;
  fallbackAlt: string;
  onAltTextSave: (photo: PhotoDto, altText: string | null) => void;
  onDelete: (photo: PhotoDto) => void;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled });
  const [alt, setAlt] = useState(photo.altText ?? '');
  const [lastAlt, setLastAlt] = useState(photo.altText ?? '');
  if ((photo.altText ?? '') !== lastAlt) {
    setLastAlt(photo.altText ?? '');
    setAlt(photo.altText ?? '');
  }
  const saveAlt = () => {
    const next = alt.trim();
    if (next !== (photo.altText ?? '')) onAltTextSave(photo, next || null);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'grid overflow-hidden rounded-lg border bg-card',
        index === 0 && 'border-2 border-primary',
        isDragging && 'z-10 shadow-overlay',
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={fileUrl(photo.url)}
          alt={photo.altText ?? fallbackAlt}
          loading="lazy"
          className="size-full object-cover"
        />
        {index === 0 && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            <Star className="size-3.5" aria-hidden="true" />
            Zdjęcie główne
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Zmień kolejność: zdjęcie ${index + 1}`}
            className="flex size-11 cursor-grab touch-none items-center justify-center rounded-md bg-card/90 text-foreground shadow-xs active:cursor-grabbing"
          >
            <GripVertical className="size-5" aria-hidden="true" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-card/90 text-destructive shadow-xs hover:bg-destructive-soft"
            aria-label={`Usuń zdjęcie ${index + 1}`}
            onClick={() => onDelete(photo)}
            disabled={disabled}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2">
        <label htmlFor={`alt-${photo.id}`} className="sr-only">
          Opis zdjęcia {index + 1}
        </label>
        <input
          id={`alt-${photo.id}`}
          value={alt}
          maxLength={300}
          placeholder="Dodaj opis zdjęcia"
          onChange={(event) => setAlt(event.target.value)}
          onBlur={saveAlt}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              saveAlt();
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm hover:border-border focus-visible:border-primary focus-visible:outline-none"
        />
        <span className="text-xs text-muted-foreground tabular">#{index + 1}</span>
      </div>
    </li>
  );
}
