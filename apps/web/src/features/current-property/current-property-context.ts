import type { PropertyListItemDto } from '@klucznik/api-client';
import { createContext, use } from 'react';

export interface CurrentPropertyContextValue {
  /** Obiekty dostępne dla użytkownika (`OWNER`: własne, `ADMIN`: wszystkie). */
  properties: readonly PropertyListItemDto[];
  /** Wybrany obiekt; `null` tylko w trakcie ładowania albo gdy użytkownik nie ma obiektów. */
  property: PropertyListItemDto | null;
  selectProperty: (id: string) => void;
  status: 'loading' | 'error' | 'empty' | 'ready';
  error: unknown;
  refetch: () => void;
}

export const CurrentPropertyContext = createContext<CurrentPropertyContextValue | null>(null);

export function useCurrentPropertyContext(): CurrentPropertyContextValue {
  const context = use(CurrentPropertyContext);
  if (!context) throw new Error('Wymagany <CurrentPropertyProvider>.');
  return context;
}

/**
 * Wybrany obiekt w widokach panelu. Widoki są renderowane dopiero po wyborze obiektu
 * (`CurrentPropertyGate`), więc tu obiekt zawsze istnieje.
 */
export function useCurrentProperty(): PropertyListItemDto {
  const { property } = useCurrentPropertyContext();
  if (!property) throw new Error('useCurrentProperty() poza CurrentPropertyGate.');
  return property;
}
