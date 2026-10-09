import { usePropertiesList } from '@klucznik/api-client';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  CurrentPropertyContext,
  type CurrentPropertyContextValue,
} from './current-property-context';

const STORAGE_KEY = 'kl.currentPropertyId';

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Brak dostępu do localStorage (tryb prywatny): wybór działa do przeładowania.
  }
}

/** Lista obiektów (`GET /properties`) i wybrany obiekt zapamiętany w `localStorage` (architecture.md). */
export function CurrentPropertyProvider({ children }: { children: ReactNode }) {
  const query = usePropertiesList(undefined, { query: { staleTime: 5 * 60_000 } });
  const [selectedId, setSelectedId] = useState<string | null>(readStoredId);

  const selectProperty = useCallback((id: string) => {
    setSelectedId(id);
    storeId(id);
  }, []);

  const value = useMemo<CurrentPropertyContextValue>(() => {
    const properties = query.data?.data ?? [];
    const property = properties.find((item) => item.id === selectedId) ?? properties[0] ?? null;
    const status = query.isPending
      ? 'loading'
      : query.isError
        ? 'error'
        : property
          ? 'ready'
          : 'empty';
    return {
      properties,
      property,
      selectProperty,
      status,
      error: query.error,
      refetch: () => void query.refetch(),
    };
  }, [query, selectedId, selectProperty]);

  return <CurrentPropertyContext value={value}>{children}</CurrentPropertyContext>;
}
