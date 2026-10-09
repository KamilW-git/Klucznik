import { isApiError, useRoomsGet } from '@klucznik/api-client';
import { Ban, ChevronLeft, Image, Info, Tags } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import { ROOM_TABS, routes, type RoomTab } from '@/app/routes';
import { BlocksTab } from '@/features/availability';
import { useCurrentProperty } from '@/features/current-property';
import { PhotosManager } from '@/features/photos';
import { PricingTab } from '@/features/pricing';
import { cn } from '@/shared/lib/cn';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { RoomInfoForm } from '../components/room-info-form';

const TAB_LABELS: Record<RoomTab, { label: string; icon: typeof Info }> = {
  informacje: { label: 'Informacje', icon: Info },
  zdjecia: { label: 'Zdjęcia', icon: Image },
  cennik: { label: 'Cennik', icon: Tags },
  blokady: { label: 'Blokady terminów', icon: Ban },
};

/** O7: edycja pokoju z zakładkami w URL (`/panel/pokoje/:roomId/:tab`). */
export function RoomEditPage() {
  const { roomId = '', tab } = useParams();
  const navigate = useNavigate();
  const property = useCurrentProperty();
  const room = useRoomsGet(roomId);

  if (!ROOM_TABS.includes(tab as RoomTab)) {
    return <Navigate to={routes.panel.room(roomId)} replace />;
  }
  const activeTab = tab as RoomTab;

  if (room.isPending) return <PageSkeleton />;
  if (room.isError) {
    return (
      <ErrorState
        error={room.error}
        title={
          isApiError(room.error) && room.error.status === 404 ? 'Nie znaleziono pokoju' : undefined
        }
        onRetry={() => void room.refetch()}
        retrying={room.isFetching}
      />
    );
  }
  // Pokój innego obiektu (po przełączeniu obiektu) → lista pokoi bieżącego obiektu.
  if (room.data.propertyId !== property.id) return <Navigate to={routes.panel.rooms()} replace />;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={
          <Link
            to={routes.panel.rooms()}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Pokoje i domki
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {room.data.name}
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                room.data.isActive
                  ? 'bg-status-confirmed text-status-confirmed-foreground'
                  : 'bg-status-expired text-status-expired-foreground',
              )}
            >
              {room.data.isActive ? 'Widoczny na stronie' : 'Ukryty'}
            </span>
          </span>
        }
        description="Informacje, galeria zdjęć, ceny sezonowe i blokady terminów."
      />
      <Tabs
        value={activeTab}
        onValueChange={(value) => void navigate(routes.panel.room(roomId, value as RoomTab))}
      >
        <TabsList aria-label="Sekcje pokoju">
          {ROOM_TABS.map((value) => {
            const { label, icon: Icon } = TAB_LABELS[value];
            return (
              <TabsTrigger key={value} value={value}>
                <Icon aria-hidden="true" />
                {label}
                {value === 'zdjecia' && (
                  <span className="rounded-full bg-muted px-2 text-xs tabular">
                    {room.data.photos.length}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="informacje" className="pt-6">
          <RoomInfoForm
            room={room.data}
            onDeleted={() => void navigate(routes.panel.rooms(), { replace: true })}
          />
        </TabsContent>
        <TabsContent value="zdjecia" className="pt-6">
          <PhotosManager
            target={{ kind: 'room', id: room.data.id }}
            photos={room.data.photos}
            fallbackAlt={room.data.name}
          />
        </TabsContent>
        <TabsContent value="cennik" className="pt-6">
          <PricingTab room={room.data} />
        </TabsContent>
        <TabsContent value="blokady" className="pt-6">
          <BlocksTab room={room.data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
