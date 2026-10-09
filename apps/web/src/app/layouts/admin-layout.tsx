import { Building2, Mail, UsersRound } from 'lucide-react';

import { routes } from '../routes';
import { PanelLayout, type NavItem } from './panel-layout';

const ADMIN_NAV: readonly NavItem[] = [
  { label: 'Właściciele', to: routes.admin.owners(), icon: UsersRound },
  { label: 'Obiekty', to: routes.admin.properties(), icon: Building2 },
  { label: 'Logi e-maili', to: routes.admin.emailLogs(), icon: Mail },
];

/** Panel admina (`/admin/*`). */
export function AdminLayout() {
  return <PanelLayout areaLabel="Administrator" nav={ADMIN_NAV} />;
}
