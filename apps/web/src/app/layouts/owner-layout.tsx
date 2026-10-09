import { usePropertiesDashboard } from '@klucznik/api-client';
import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { Outlet } from 'react-router';

import {
  CurrentPropertyGate,
  CurrentPropertyProvider,
  PropertySwitcher,
  useCurrentPropertyContext,
} from '@/features/current-property';

import { routes } from '../routes';
import { PanelLayout, type NavItem } from './panel-layout';

/** Panel Gospodarza (`/panel/*`): przełącznik obiektu, licznik oczekujących, widoki po wyborze obiektu. */
export function OwnerLayout() {
  return (
    <CurrentPropertyProvider>
      <OwnerShell />
    </CurrentPropertyProvider>
  );
}

function OwnerShell() {
  const { property } = useCurrentPropertyContext();
  // Ten sam klucz co pulpit: jedno zapytanie w cache.
  const dashboard = usePropertiesDashboard(property?.id ?? '', {
    query: { enabled: Boolean(property) },
  });
  const pendingCount = dashboard.data?.pendingCount ?? 0;

  const nav: readonly NavItem[] = [
    { label: 'Pulpit', to: routes.panel.dashboard(), icon: LayoutDashboard, end: true },
    { label: 'Kalendarz', to: routes.panel.calendar(), icon: CalendarDays },
    {
      label: 'Rezerwacje',
      to: routes.panel.reservations(),
      icon: ClipboardList,
      badge: { count: pendingCount, label: 'oczekujących na decyzję' },
    },
    { label: 'Pokoje i domki', to: routes.panel.rooms(), icon: BedDouble },
    { label: 'Goście', to: routes.panel.guests(), icon: Users },
    { label: 'Ustawienia obiektu', to: routes.panel.settings(), icon: Settings },
  ];

  return (
    <PanelLayout areaLabel="Panel Gospodarza" nav={nav} sidebarHeader={<PropertySwitcher />}>
      <CurrentPropertyGate>
        <Outlet />
      </CurrentPropertyGate>
    </PanelLayout>
  );
}
