import { Check, ChevronsUpDown, MapPin } from 'lucide-react';

import { pluralize } from '@/shared/lib/dates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Skeleton } from '@/shared/ui/skeleton';

import { useCurrentPropertyContext } from './current-property-context';

function unitsLabel(count: number) {
  return `${count} ${pluralize(count, 'jednostka', 'jednostki', 'jednostek')}`;
}

/** Przełącznik obiektu w sidebarze; przy jednym obiekcie tylko etykieta. */
export function PropertySwitcher() {
  const { properties, property, selectProperty, status } = useCurrentPropertyContext();

  if (status === 'loading') return <Skeleton className="mx-3 h-18 rounded-lg" />;
  if (!property) return null;

  const summary = (
    <span className="grid min-w-0 flex-1 gap-0.5 text-left">
      <span className="text-overline text-muted-foreground uppercase">Aktywny obiekt</span>
      <span className="truncate text-base font-semibold">{property.name}</span>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {[property.city, unitsLabel(property.roomsCount)].filter(Boolean).join(' • ')}
        </span>
      </span>
    </span>
  );

  if (properties.length <= 1) {
    return <div className="mx-3 flex rounded-lg border bg-background px-4 py-3">{summary}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Zmień obiekt (aktywny: ${property.name})`}
          className="mx-3 flex items-center gap-2 rounded-lg border bg-background px-4 py-3 hover:border-primary/40 hover:bg-accent"
        >
          {summary}
          <ChevronsUpDown className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {properties.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => selectProperty(item.id)}>
            <span className="grid flex-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">
                {[item.city, unitsLabel(item.roomsCount), !item.isActive && 'nieaktywny']
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            </span>
            {item.id === property.id && <Check className="text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
