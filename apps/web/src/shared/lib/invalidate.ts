import type { QueryClient } from '@tanstack/react-query';

/**
 * Unieważnia zapytania po ścieżce API. Klucze orval mają postać `[ścieżka, params?]`,
 * np. `['/api/v1/properties/<id>/calendar', { from, to }]`.
 */
export function invalidatePaths(queryClient: QueryClient, patterns: readonly RegExp[]) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const path = query.queryKey[0];
      return typeof path === 'string' && patterns.some((pattern) => pattern.test(path));
    },
  });
}

/** Wszystko, co zależy od rezerwacji: lista, szczegóły, kalendarz, pulpit, wyceny, pokoje, goście. */
export const RESERVATION_DEPENDENT_PATHS = [
  /^\/api\/v1\/reservations/,
  /^\/api\/v1\/properties\/[^/]+\/(calendar|dashboard|guests)$/,
  /^\/api\/v1\/rooms\/[^/]+\/quote$/,
  /^\/api\/v1\/properties\/[^/]+\/rooms$/,
  /^\/api\/v1\/rooms\/[^/]+$/,
] as const;

export function invalidateReservations(queryClient: QueryClient) {
  return invalidatePaths(queryClient, RESERVATION_DEPENDENT_PATHS);
}

/** Dane pokoi (lista, szczegóły, kalendarz, wyceny i pulpit zależą od cen i aktywności pokoi). */
export function invalidateRooms(queryClient: QueryClient) {
  return invalidatePaths(queryClient, [
    /^\/api\/v1\/rooms\//,
    /^\/api\/v1\/properties\/[^/]+\/(rooms|calendar|dashboard)$/,
    /^\/api\/v1\/properties$/,
  ]);
}

/** Dostępność pokoju: blokady, kalendarz, wyceny. */
export function invalidateAvailability(queryClient: QueryClient) {
  return invalidatePaths(queryClient, [
    /^\/api\/v1\/rooms\/[^/]+\/(blocks|quote)$/,
    /^\/api\/v1\/properties\/[^/]+\/calendar$/,
  ]);
}

/** Stawki sezonowe pokoju i wyceny (cena w O5 zależy od cennika). */
export function invalidateRates(queryClient: QueryClient) {
  return invalidatePaths(queryClient, [/^\/api\/v1\/rooms\/[^/]+\/(rates|quote)$/]);
}

/** Ustawienia i zdjęcia obiektu. */
export function invalidateProperty(queryClient: QueryClient) {
  return invalidatePaths(queryClient, [/^\/api\/v1\/properties/]);
}
