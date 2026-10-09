import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

import { routes } from '../routes';
import { PanelLayout, type NavItem } from './panel-layout';

const OWNER_NAV: readonly NavItem[] = [
  { label: 'Pulpit', to: routes.panel.dashboard(), icon: LayoutDashboard, end: true },
  { label: 'Kalendarz', to: routes.panel.calendar(), icon: CalendarDays },
  { label: 'Rezerwacje', to: routes.panel.reservations(), icon: ClipboardList },
  { label: 'Pokoje i domki', to: routes.panel.rooms(), icon: BedDouble },
  { label: 'Goście', to: routes.panel.guests(), icon: Users },
  { label: 'Ustawienia obiektu', to: routes.panel.settings(), icon: Settings },
];

/** Panel Gospodarza (`/panel/*`). Przełącznik obiektu (`CurrentPropertyProvider`) dochodzi w M11. */
export function OwnerLayout() {
  return <PanelLayout areaLabel="Panel Gospodarza" nav={OWNER_NAV} />;
}
