import { Loader2 } from 'lucide-react';

/** Ekran na czas odzyskiwania sesji przy starcie aplikacji i ładowania kodu obszaru. */
export function FullPageLoader() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Ładowanie…</span>
    </div>
  );
}
