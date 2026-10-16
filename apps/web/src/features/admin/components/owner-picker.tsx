import { useAdminOwnersGet, useAdminOwnersList } from '@klucznik/api-client';
import { Command } from 'cmdk';
import { Search, UserRound, X } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui/button';
import { inputClassName } from '@/shared/ui/input';

interface OwnerPickerProps {
  /** Wybrany właściciel (`ownerId` z URL). */
  ownerId: string | null;
  onChange: (ownerId: string | null) => void;
}

const MIN_QUERY = 2;

/**
 * Filtr „Właściciel” (lista obiektów): wyszukiwanie w `GET /admin/owners?q=` (debounce, min. 2 znaki).
 * Wybrany właściciel z linku (`?ownerId=`) ma nazwę z `GET /admin/owners/:id`.
 */
export function OwnerPicker({ ownerId, onChange }: OwnerPickerProps) {
  const selected = useAdminOwnersGet(ownerId ?? '', { query: { enabled: Boolean(ownerId) } });
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const owners = useAdminOwnersList(
    { q: debounced, pageSize: 8, sort: 'lastName:asc' },
    { query: { enabled: !ownerId && debounced.length >= MIN_QUERY } },
  );

  if (ownerId) {
    const label = selected.data
      ? `${selected.data.firstName} ${selected.data.lastName}`
      : selected.isError
        ? 'Nieznany właściciel'
        : 'Wczytywanie…';
    return (
      <div className="flex h-12 items-center gap-2 rounded-md border border-input bg-card pr-1 pl-4">
        <UserRound className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-base">
          <span className="sr-only">Właściciel: </span>
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setQuery('');
            onChange(null);
          }}
          aria-label="Wyczyść filtr właściciela"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const showList = query.trim().length >= MIN_QUERY;
  return (
    <Command shouldFilter={false} label="Filtruj po właścicielu" className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Właściciel: nazwisko lub e-mail"
          aria-label="Filtruj po właścicielu"
          className={cn(inputClassName, 'pl-11 focus-visible:pl-[43px]')}
        />
      </div>
      {showList && (
        <Command.List className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-overlay">
          {owners.isFetching && !owners.data && (
            <Command.Loading>
              <p className="px-3 py-2 text-sm text-muted-foreground">Szukam…</p>
            </Command.Loading>
          )}
          {owners.data?.data.map((owner) => (
            <Command.Item
              key={owner.id}
              value={owner.id}
              onSelect={() => onChange(owner.id)}
              className="flex min-h-12 cursor-pointer flex-col justify-center rounded-md px-3 py-2 data-[selected=true]:bg-accent"
            >
              <span className="font-medium">
                {owner.firstName} {owner.lastName}
              </span>
              <span className="truncate text-sm text-muted-foreground">{owner.email}</span>
            </Command.Item>
          ))}
          {owners.data && owners.data.data.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Brak właściciela pasującego do „{query.trim()}”.
            </p>
          )}
        </Command.List>
      )}
    </Command>
  );
}
