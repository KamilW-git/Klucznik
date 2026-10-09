import { useRoomsList, type RoomDto } from '@klucznik/api-client';
import {
  BedDouble,
  CalendarCheck,
  ImageOff,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { routes } from '@/app/routes';
import { useCurrentProperty } from '@/features/current-property';
import { cn } from '@/shared/lib/cn';
import { formatNights, pluralize } from '@/shared/lib/dates';
import { fileUrl } from '@/shared/lib/file-url';
import { formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { PageHeader } from '@/shared/ui/page-header';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { Switch } from '@/shared/ui/switch';

import { DeleteRoomDialog } from '../components/delete-room-dialog';
import { useToggleRoomActive } from '../hooks/use-room-mutations';

type RoomFilter = 'all' | 'active' | 'inactive';

/** O6: siatka kart pokoi z przełącznikiem widoczności, filtrem i usuwaniem. */
export function RoomsPage() {
  const property = useCurrentProperty();
  const rooms = useRoomsList(property.id, { includeInactive: true });
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [deleting, setDeleting] = useState<RoomDto | null>(null);

  const all = rooms.data?.data ?? [];
  const activeCount = all.filter((room) => room.isActive).length;
  const visible = all.filter((room) =>
    filter === 'all' ? true : filter === 'active' ? room.isActive : !room.isActive,
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pokoje i domki"
        description="Jednostki do wynajęcia, ich ceny bazowe i widoczność na stronie obiektu."
        actions={
          <Button asChild>
            <Link to={routes.panel.roomNew()}>
              <Plus aria-hidden="true" />
              Dodaj pokój
            </Link>
          </Button>
        }
      />

      {rooms.isPending ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="status">
          <span className="sr-only">Ładowanie pokoi…</span>
          {[0, 1, 2].map((index) => (
            <div key={index} className="grid gap-3 rounded-lg border bg-card p-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : rooms.isError ? (
        <ErrorState
          error={rooms.error}
          onRetry={() => void rooms.refetch()}
          retrying={rooms.isFetching}
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon={<BedDouble aria-hidden="true" />}
          title="Nie masz jeszcze żadnych pokoi"
          description="Dodaj pierwszy pokój lub domek, aby goście mogli rezerwować."
          actions={
            <Button asChild>
              <Link to={routes.panel.roomNew()}>
                <Plus aria-hidden="true" />
                Dodaj pokój
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div role="group" aria-label="Filtr pokoi" className="flex flex-wrap gap-2">
            {(
              [
                ['all', `Wszystkie (${all.length})`],
                ['active', `Widoczne (${activeCount})`],
                ['inactive', `Ukryte (${all.length - activeCount})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm font-medium',
                  filter === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-accent',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((room) => (
              <li key={room.id}>
                <RoomCard room={room} onDelete={() => setDeleting(room)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <DeleteRoomDialog room={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </div>
  );
}

function RoomCard({ room, onDelete }: { room: RoomDto; onDelete: () => void }) {
  const toggle = useToggleRoomActive();
  const editUrl = routes.panel.room(room.id);
  const switchId = `room-active-${room.id}`;
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-raised',
        !room.isActive && 'bg-muted/60',
      )}
    >
      <div className={cn('relative aspect-[16/9] bg-muted', !room.isActive && 'grayscale')}>
        {room.coverPhoto ? (
          <img
            src={fileUrl(room.coverPhoto.url)}
            alt={room.coverPhoto.altText ?? room.name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="text-sm">Brak zdjęć</span>
          </div>
        )}
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-xs',
            room.isActive ? 'bg-card text-success' : 'bg-card text-warning',
          )}
        >
          {room.isActive ? 'Widoczny na stronie' : 'Ukryty'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-title">{room.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              do {room.capacity} {pluralize(room.capacity, 'osoby', 'osób', 'osób')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <label htmlFor={switchId} className="text-xs text-muted-foreground">
              Widoczny na stronie
            </label>
            <Switch
              id={switchId}
              checked={room.isActive}
              disabled={toggle.isPending}
              onCheckedChange={(checked) =>
                toggle.mutate({ id: room.id, data: { isActive: checked } })
              }
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-background p-3">
            <dt className="text-xs text-muted-foreground">Cena bazowa</dt>
            <dd className="text-title-sm tabular">
              {formatMoney(room.basePricePerNight, room.currency)}
              <span className="text-sm font-normal text-muted-foreground"> / noc</span>
            </dd>
          </div>
          <div className="rounded-md bg-background p-3">
            <dt className="text-xs text-muted-foreground">Minimalny pobyt</dt>
            <dd className="text-base font-semibold">{formatNights(room.minNights)}</dd>
          </div>
        </dl>
        <p className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          <CalendarCheck className="size-4" aria-hidden="true" />
          Nadchodzące rezerwacje: <strong>{room.upcomingReservationsCount}</strong>
        </p>
        <div className="mt-auto flex gap-2">
          <Button asChild className="flex-1" variant={room.isActive ? 'primary' : 'outline'}>
            <Link to={editUrl}>
              <Pencil aria-hidden="true" />
              Edytuj
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Więcej akcji: ${room.name}`}>
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 aria-hidden="true" />
                Usuń pokój
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
