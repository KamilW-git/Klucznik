import { useSyncExternalStore } from 'react';

function supported(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** Dopasowanie media query (np. liczba miesięcy kalendarza na telefonie); bez `matchMedia` → `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!supported()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => supported() && window.matchMedia(query).matches,
    () => false,
  );
}
