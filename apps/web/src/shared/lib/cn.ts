import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Własne rozmiary tekstu z `styles.css`, żeby `twMerge` nie traktował ich jak kolorów.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'headline', 'title-lg', 'title', 'title-sm', 'overline'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
