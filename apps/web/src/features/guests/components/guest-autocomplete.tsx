import { useGuestsList, type GuestListItemDto } from '@klucznik/api-client';
import { Command } from 'cmdk';
import { Search, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { pluralize } from '@/shared/lib/dates';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { inputClassName } from '@/shared/ui/input';

interface GuestAutocompleteProps {
  propertyId: string;
  onSelect: (guest: GuestListItemDto) => void;
  /** „Dodaj nowego gościa”: wpisany tekst jako podpowiedź imienia i nazwiska. */
  onCreateNew: (query: string) => void;
  'aria-describedby'?: string;
}

const MIN_QUERY = 2;

/**
 * Wyszukiwanie gościa obiektu (`GET /properties/:id/guests?q=`): debounce 300 ms, min. 2 znaki,
 * opcja „Dodaj nowego gościa” (guests.md). Klawiatura: strzałki + Enter (cmdk).
 */
export function GuestAutocomplete({
  propertyId,
  onSelect,
  onCreateNew,
  'aria-describedby': describedBy,
}: GuestAutocompleteProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = debounced.length >= MIN_QUERY;
  const guests = useGuestsList(
    propertyId,
    { q: debounced, pageSize: 8, sort: 'lastName:asc' },
    { query: { enabled } },
  );
  const showList = query.trim().length >= MIN_QUERY;

  return (
    <Command shouldFilter={false} label="Wyszukaj gościa" className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Nazwisko, e-mail lub telefon"
          aria-label="Wyszukaj gościa"
          aria-describedby={describedBy}
          className={cn(inputClassName, 'pl-11 focus-visible:pl-[43px]')}
        />
      </div>
      {showList && (
        <Command.List className="mt-2 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-overlay">
          {guests.isFetching && !guests.data && (
            <Command.Loading>
              <p className="px-3 py-2 text-sm text-muted-foreground">Szukam…</p>
            </Command.Loading>
          )}
          {guests.data?.data.map((guest) => (
            <Command.Item
              key={guest.id}
              value={guest.id}
              onSelect={() => onSelect(guest)}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2 data-[selected=true]:bg-accent"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {guest.firstName.charAt(0)}
                {guest.lastName.charAt(0)}
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="font-medium">
                  {guest.firstName} {guest.lastName}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {[guest.email, guest.phone].filter(Boolean).join(' • ') || 'brak kontaktu'}
                </span>
              </span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {guest.reservationsCount}{' '}
                {pluralize(guest.reservationsCount, 'rezerwacja', 'rezerwacje', 'rezerwacji')}
              </span>
            </Command.Item>
          ))}
          {guests.data && guests.data.data.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Brak gościa pasującego do „{query.trim()}”.
            </p>
          )}
          <Command.Item
            value="__new__"
            onSelect={() => onCreateNew(query.trim())}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2 font-medium text-primary data-[selected=true]:bg-accent"
          >
            <UserPlus className="size-5" aria-hidden="true" />
            Dodaj nowego gościa
          </Command.Item>
        </Command.List>
      )}
    </Command>
  );
}
