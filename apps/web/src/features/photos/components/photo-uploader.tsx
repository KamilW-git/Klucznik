import { CheckCircle2, CircleAlert, CloudUpload, Loader2, X } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

import { ACCEPTED_TYPES, MAX_PHOTOS, type UploadItem } from '../hooks/use-photo-upload';

interface PhotoUploaderProps {
  items: readonly UploadItem[];
  onFiles: (files: File[]) => void;
  onDismiss: (key: string) => void;
  slotsLeft: number;
}

const STATUS_LABELS = {
  queued: 'W kolejce',
  uploading: 'Wysyłanie…',
  done: 'Dodano',
  error: 'Błąd',
} as const;

/** Strefa upuszczania i wyboru plików + lista wysyłek ze stanem per plik (O7, O8). */
export function PhotoUploader({ items, onFiles, onDismiss, slotsLeft }: PhotoUploaderProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const full = slotsLeft <= 0;

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!full) onFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="grid gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-background px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50',
          full && 'cursor-not-allowed opacity-60',
        )}
      >
        <CloudUpload className="size-8 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold">
          {full
            ? `Galeria jest pełna (${MAX_PHOTOS} zdjęć)`
            : 'Przeciągnij zdjęcia lub kliknij, aby wybrać'}
        </span>
        <span className="text-sm text-muted-foreground">
          JPG, PNG lub WebP, do 10 MB. Pierwsze zdjęcie jest zdjęciem głównym.
        </span>
        <span className={cn('mt-2', buttonLikeClass)}>Wybierz pliki z dysku</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          disabled={full}
          className="sr-only"
          onChange={(event) => {
            onFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="grid gap-2" aria-label="Wysyłane zdjęcia" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm',
                item.status === 'error' && 'border-destructive/40 bg-destructive-soft',
              )}
            >
              {item.status === 'done' ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
              ) : item.status === 'error' ? (
                <CircleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" />
              ) : (
                <Loader2
                  className={cn(
                    'size-5 shrink-0 text-primary',
                    item.status === 'uploading' && 'animate-spin',
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="truncate font-medium">{item.name}</span>
                {item.status === 'error' ? (
                  <span className="text-destructive">{item.error}</span>
                ) : (
                  <span className="text-muted-foreground">{STATUS_LABELS[item.status]}</span>
                )}
                {item.status === 'uploading' && (
                  <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
                  </span>
                )}
              </span>
              {(item.status === 'error' || item.status === 'done') && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ukryj ${item.name}`}
                  onClick={() => onDismiss(item.key)}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const buttonLikeClass =
  'inline-flex h-11 items-center rounded-md border-[1.5px] border-primary/25 bg-card px-4 text-base font-semibold text-primary';
