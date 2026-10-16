/** Bez znaków łatwych do pomylenia przy dyktowaniu (0/O, 1/l/I). */
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*?';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

export const PASSWORD_MIN_LENGTH = 10;

function randomIndex(max: number): number {
  // Odrzucanie wartości spoza wielokrotności `max`, żeby rozkład był równy.
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) return value % max;
  }
}

const pick = (alphabet: string) => alphabet[randomIndex(alphabet.length)]!;

/**
 * Hasło tymczasowe właściciela (admin-owners.md): kryptograficznie losowe, co najmniej po jednym
 * znaku z każdej grupy. Nie jest nigdzie zapisywane – admin przekazuje je osobnym kanałem.
 */
export function generatePassword(length = 16): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < Math.max(length, PASSWORD_MIN_LENGTH)) chars.push(pick(ALL));
  // Fisher–Yates: grupy obowiązkowe nie stoją zawsze na początku.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [chars[index], chars[other]] = [chars[other]!, chars[index]!];
  }
  return chars.join('');
}
