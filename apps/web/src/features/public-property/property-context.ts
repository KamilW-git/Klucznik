import type { PublicPropertyDto } from '@klucznik/api-client';
import { useOutletContext } from 'react-router';

/** Obiekt pobrany przez `PublicPropertyLayout` dla wszystkich stron `/o/:slug/*`. */
export function usePublicProperty(): PublicPropertyDto {
  return useOutletContext<PublicPropertyDto>();
}
