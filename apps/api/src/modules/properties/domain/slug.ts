/** Slug publicznej strony obiektu `/o/:slug` (docs/features/properties.md). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;

const FALLBACK = 'obiekt';

// Znaki, których NFD nie rozkłada na literę bazową + znak diakrytyczny.
const TRANSLITERATION: Record<string, string> = { ł: 'l', Ł: 'l', ß: 'ss', æ: 'ae', ø: 'o' };

export function isValidSlug(value: string): boolean {
  return (
    value.length >= SLUG_MIN_LENGTH && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value)
  );
}

function truncate(value: string, maxLength: number): string {
  return value.slice(0, maxLength).replace(/-+$/, '');
}

/**
 * Slug z nazwy: transliteracja polskich znaków (`ą→a`, `ł→l`, …), kebab-case, 3–60 znaków.
 * Zbyt krótki wynik (np. nazwa „Ał”) dostaje prefiks `obiekt-`.
 */
export function slugify(name: string): string {
  const ascii = name
    .replace(/[łŁßæø]/g, (char) => TRANSLITERATION[char] ?? char)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  const slug = truncate(ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+/, ''), SLUG_MAX_LENGTH);

  if (slug.length === 0) {
    return FALLBACK;
  }
  return slug.length < SLUG_MIN_LENGTH ? truncate(`${FALLBACK}-${slug}`, SLUG_MAX_LENGTH) : slug;
}

/**
 * Pierwszy wolny wariant sluga: `base`, `base-2`, `base-3`, …
 * Przy długim `base` skraca go tak, żeby wynik z sufiksem mieścił się w 60 znakach.
 */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) {
    return base;
  }
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${truncate(base, SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}
