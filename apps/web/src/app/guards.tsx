import type { Role } from '@klucznik/api-client';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';

import { useAuth } from '@/features/auth';

import { FullPageLoader } from './pages/full-page-loader';
import { homeFor, routes, safeNext } from './routes';

/**
 * Wymaga sesji. Czeka na bootstrap (`loading`); bez sesji → `/logowanie?next=<ścieżka>`
 * (bez `next` po świadomym wylogowaniu). Ochrona w UI to wygoda – autoryzację wymusza API.
 */
export function RequireAuth() {
  const { status, endReason } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={routes.login(endReason === 'logout' ? undefined : next)} replace />;
  }
  return <Outlet />;
}

/** Zła rola → panel właściwy dla roli (`ADMIN` → `/admin`, `OWNER` → `/panel`). */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

/** `/logowanie` dla zalogowanych: przekierowanie do `?next=` albo panelu roli. */
export function RedirectIfAuthenticated() {
  const { status, user } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated' && user) {
    return <Navigate to={safeNext(searchParams.get('next')) ?? homeFor(user.role)} replace />;
  }
  return <Outlet />;
}

/** `/`: zalogowany → panel roli, pozostali → logowanie. */
export function RootRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  return <Navigate to={user ? homeFor(user.role) : routes.login()} replace />;
}
