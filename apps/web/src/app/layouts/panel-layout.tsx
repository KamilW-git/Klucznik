import type { MeDto } from '@klucznik/api-client';
import { ChevronDown, LayoutGrid, LogOut, Menu, Shield, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Logo } from '@/shared/ui/logo';
import { Sheet, SheetContent } from '@/shared/ui/sheet';

import { routes } from '../routes';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Aktywny tylko przy dokładnym dopasowaniu (pulpit `/panel`). */
  end?: boolean;
  /** Licznik przy pozycji (np. oczekujące rezerwacje). */
  badge?: { count: number; label: string };
}

interface PanelLayoutProps {
  /** Etykieta obszaru pod logo („Panel Gospodarza”, „Administrator”). */
  areaLabel: string;
  nav: readonly NavItem[];
  /** Miejsce nad nawigacją (przełącznik obiektu). */
  sidebarHeader?: ReactNode;
  /** Treść obszaru; domyślnie `<Outlet />`. */
  children?: ReactNode;
}

/**
 * Wspólny szkielet paneli: sidebar (desktop, ≥ 1024 px), górny pasek z menu w panelu bocznym
 * (tablet, telefon) i menu użytkownika z wylogowaniem.
 */
export function PanelLayout({ areaLabel, nav, sidebarHeader, children }: PanelLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <>
      {sidebarHeader}
      <nav aria-label="Nawigacja główna" className="grid gap-1 px-3">
        {nav.map((item) => (
          <SidebarLink key={item.to} item={item} onNavigate={() => setMenuOpen(false)} />
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r bg-card py-6 lg:flex">
        <div className="px-6">
          <Logo subtitle={areaLabel} />
        </div>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6 lg:justify-end lg:px-10">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Otwórz menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <SheetContent side="left" title="Menu">
              <div className="grid gap-6 pb-6">
                <div className="px-6">
                  <Logo subtitle={areaLabel} />
                </div>
                {sidebar}
              </div>
            </SheetContent>
          </Sheet>
          <Logo className="lg:hidden" />
          <div className="ml-auto lg:ml-0">
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 items-center gap-3 rounded-md px-4 text-base font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-foreground hover:bg-accent hover:text-primary',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {item.badge && item.badge.count > 0 && (
        <span className="min-w-6 rounded-full bg-highlight-strong px-2 py-0.5 text-center text-xs font-semibold text-highlight-foreground tabular">
          {item.badge.count}
          <span className="sr-only"> {item.badge.label}</span>
        </span>
      )}
    </NavLink>
  );
}

function initials(user: MeDto): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

const ROLE_LABELS: Record<MeDto['role'], string> = {
  OWNER: 'Właściciel obiektu',
  ADMIN: 'Administrator',
};

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const onLogout = async () => {
    await logout();
    void navigate(routes.login(), { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Menu użytkownika: ${user.firstName} ${user.lastName}`}
          className="flex min-h-11 items-center gap-3 rounded-md px-2 text-left hover:bg-accent"
        >
          <span
            className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(user)}
          </span>
          <span className="hidden sm:grid">
            <span className="text-sm font-semibold">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        {user.role === 'ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={routes.admin.owners()}>
                <Shield aria-hidden="true" />
                Panel admina
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={routes.panel.dashboard()}>
                <LayoutGrid aria-hidden="true" />
                Panel Gospodarza
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void onLogout()}>
          <LogOut aria-hidden="true" />
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
