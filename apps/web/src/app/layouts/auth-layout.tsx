import { CalendarDays, MailCheck, ShieldCheck } from 'lucide-react';
import { Outlet } from 'react-router';

import { Logo } from '@/shared/ui/logo';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Rezerwacje w jednym miejscu',
    text: 'Prośby z Twojej strony i rezerwacje telefoniczne na jednej liście, bez ryzyka podwójnej rezerwacji.',
  },
  {
    icon: CalendarDays,
    title: 'Kalendarz obłożenia',
    text: 'Przejrzysty widok wszystkich pokoi i domków, na komputerze i na telefonie.',
  },
  {
    icon: MailCheck,
    title: 'Automatyczne e-maile do gości',
    text: 'Potwierdzenia, anulowania i przypomnienia o przyjeździe wysyłają się same.',
  },
] as const;

/** Logowanie (O1): panel marki Klucznik z lewej (desktop), formularz z prawej. */
export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-primary-hover via-primary to-primary-hover p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-4">
          <Logo tone="light" subtitle="System dla gospodarzy" />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
            <span className="size-2 rounded-full bg-highlight" aria-hidden="true" />
            Panel Gospodarza
          </span>
        </div>

        <div className="my-auto grid max-w-xl gap-8 py-12">
          <div className="grid gap-4">
            <p className="text-headline text-white">
              Twój e-recepcjonista – przyjmuje rezerwacje, także gdy śpisz
            </p>
            <p className="text-lg text-white/80">
              Stworzony dla właścicieli domków, pensjonatów i agroturystyk. Prosty w obsłudze,
              bezpieczny i zawsze pod ręką.
            </p>
          </div>
          <ul className="grid gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.07] p-5"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <span className="grid gap-1">
                  <span className="text-title-sm text-white">{title}</span>
                  <span className="text-base text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
        <Logo className="mb-10 lg:hidden" subtitle="Panel Gospodarza" />
        <div className="mx-auto my-auto w-full max-w-[34rem]">
          <Outlet />
        </div>
        <footer className="mx-auto mt-12 w-full max-w-[34rem] border-t pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Klucznik – Twój e-recepcjonista
        </footer>
      </main>
    </div>
  );
}
