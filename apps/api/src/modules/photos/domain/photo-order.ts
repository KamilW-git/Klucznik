/**
 * Nowa kolejność galerii po przesunięciu zdjęcia `id` na pozycję `position` (0 = zdjęcie główne).
 * Pozycja poza zakresem trafia na koniec. Wynik to id w kolejności `sortOrder = 0, 1, 2, …`.
 */
export function moveToPosition(
  orderedIds: readonly string[],
  id: string,
  position: number,
): string[] {
  const rest = orderedIds.filter((other) => other !== id);
  if (rest.length === orderedIds.length) {
    throw new RangeError(`Photo ${id} is not in the gallery`);
  }
  const target = Math.max(0, Math.min(position, rest.length));
  return [...rest.slice(0, target), id, ...rest.slice(target)];
}

/** Maksymalna liczba zdjęć w galerii obiektu lub pokoju (Q-14). */
export const PHOTO_LIMIT = 20;
