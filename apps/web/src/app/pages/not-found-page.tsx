import { Compass, TreePine } from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/button';

import { homeFor, routes } from '../routes';

/** 404 „Nie znaleziono strony” (S1, sekcja 03). */
export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-16">
      <TreePine
        className="pointer-events-none absolute -left-6 bottom-6 size-48 text-primary/5 sm:size-72"
        aria-hidden="true"
      />
      <TreePine
        className="pointer-events-none absolute -right-8 top-10 size-40 text-primary/5 sm:size-64"
        aria-hidden="true"
      />
      <div className="relative grid max-w-lg justify-items-center gap-4 text-center">
        <p className="text-[6rem] leading-none font-bold tracking-tight text-primary tabular sm:text-[8rem]">
          4<span className="text-highlight">0</span>4
        </p>
        <h1 className="text-title-lg">Nie znaleziono strony</h1>
        <p className="text-base text-muted-foreground">
          Wygląda na to, że ta ścieżka nigdzie nie prowadzi. Sprawdź adres albo wróć do swojego
          panelu.
        </p>
        <Button asChild className="mt-4">
          <Link to={user ? homeFor(user.role) : routes.login()}>
            <Compass aria-hidden="true" />
            {user ? 'Wróć do panelu' : 'Przejdź do logowania'}
          </Link>
        </Button>
      </div>
    </main>
  );
}
