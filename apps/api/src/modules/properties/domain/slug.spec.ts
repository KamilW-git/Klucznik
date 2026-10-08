import { firstFreeSlug, isValidSlug, SLUG_MAX_LENGTH, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Domki Leśna Polana', 'domki-lesna-polana'],
    ['Zażółć gęślą jaźń', 'zazolc-gesla-jazn'],
    ['ŁÓDŹ – Pokoje & Apartamenty!', 'lodz-pokoje-apartamenty'],
    ['  --Pensjonat   "Pod Lipami"--  ', 'pensjonat-pod-lipami'],
    ['Agroturystyka nr 7', 'agroturystyka-nr-7'],
  ])('transliterates and kebab-cases "%s"', (name, expected) => {
    expect(slugify(name)).toBe(expected);
  });

  it('pads too short slugs with a prefix', () => {
    expect(slugify('Ał')).toBe('obiekt-al');
    expect(slugify('!!!')).toBe('obiekt');
  });

  it('limits length to 60 characters without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(59)} b c`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });

  it('always produces a valid slug', () => {
    for (const name of ['Ą', 'Hotel', 'Ośrodek Wypoczynkowy „Sosnowy Gaj”', '123']) {
      expect(isValidSlug(slugify(name))).toBe(true);
    }
  });
});

describe('firstFreeSlug', () => {
  it('returns the base when it is free', () => {
    expect(firstFreeSlug('lesna-polana', new Set())).toBe('lesna-polana');
  });

  it('appends -2, -3 on collisions', () => {
    expect(firstFreeSlug('lesna-polana', new Set(['lesna-polana']))).toBe('lesna-polana-2');
    expect(firstFreeSlug('lesna-polana', new Set(['lesna-polana', 'lesna-polana-2']))).toBe(
      'lesna-polana-3',
    );
  });

  it('shortens a long base so that the suffix fits in 60 characters', () => {
    const base = 'a'.repeat(SLUG_MAX_LENGTH);
    const slug = firstFreeSlug(base, new Set([base]));
    expect(slug).toBe(`${'a'.repeat(SLUG_MAX_LENGTH - 2)}-2`);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe('isValidSlug', () => {
  it.each(['ab', 'Abc', 'a--b', '-abc', 'abc-', 'ąbc', 'a'.repeat(61)])('rejects "%s"', (value) => {
    expect(isValidSlug(value)).toBe(false);
  });
});
