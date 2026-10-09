import { KeyRound } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

interface LogoProps {
  /** `light` na ciemnym tle (panel marki na ekranie logowania). */
  tone?: 'default' | 'light';
  subtitle?: string;
  className?: string;
}

/** Znak marki Klucznik (platforma, nie obiekt: strona publiczna pokazuje markę obiektu). */
export function Logo({ tone = 'default', subtitle, className }: LogoProps) {
  const light = tone === 'light';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-md',
          light
            ? 'border border-white/15 bg-white/10 text-sand'
            : 'bg-primary text-primary-foreground',
        )}
        aria-hidden="true"
      >
        <KeyRound className="size-6" />
      </span>
      <span className="grid">
        <span className={cn('text-title font-bold', light ? 'text-white' : 'text-primary')}>
          Klucznik
        </span>
        {subtitle && (
          <span
            className={cn(
              'text-overline uppercase',
              light ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </div>
  );
}
