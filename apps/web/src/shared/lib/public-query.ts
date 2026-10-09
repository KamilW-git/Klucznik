import type { QueryClient } from '@tanstack/react-query';

import { invalidatePaths } from './invalidate';

/**
 * Zapytania strony publicznej (data-and-auth.md#tanstack-query): strona obiektu zmienia się rzadko,
 * a gość nie potrzebuje odświeżania po powrocie do karty.
 */
export const PUBLIC_PROPERTY_QUERY = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;

/** Dostępność, ceny i zajętość: krócej, bo zmieniają się z każdą rezerwacją. */
export const PUBLIC_AVAILABILITY_QUERY = {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
} as const;

/** Po wysłaniu prośby albo kolizji (BR-01): dostępność i zajętość obiektu. */
export function invalidatePublicAvailability(queryClient: QueryClient) {
  return invalidatePaths(queryClient, [
    /^\/api\/v1\/public\/properties\/[^/]+\/(availability|occupancy)$/,
  ]);
}
