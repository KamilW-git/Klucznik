import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RedirectIfAuthenticated, RequireAuth, RequireRole, RootRedirect } from './guards';
import { ComingSoonPage } from './pages/coming-soon-page';
import { FullPageLoader } from './pages/full-page-loader';
import { NotFoundPage } from './pages/not-found-page';
import { RouteErrorPage } from './pages/route-error-page';
import { paths, routes } from './routes';

/** Definicja tras (architecture.md#routing). Kod obszarów ładowany leniwie (`lazy`). */
const areaRoutes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        lazy: async () => ({
          Component: (await import('./layouts/auth-layout')).AuthLayout,
        }),
        children: [
          {
            path: paths.login,
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/login-page')).LoginPage,
            }),
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['OWNER', 'ADMIN']} />,
        children: [
          {
            path: paths.panel.root,
            lazy: async () => ({
              Component: (await import('./layouts/owner-layout')).OwnerLayout,
            }),
            children: [
              { index: true, element: <ComingSoonPage title="Pulpit" milestone="M11" /> },
              {
                path: paths.panel.calendar,
                element: <ComingSoonPage title="Kalendarz" milestone="M11" />,
              },
              {
                path: paths.panel.reservations,
                element: <ComingSoonPage title="Rezerwacje" milestone="M11" />,
              },
              {
                path: paths.panel.reservation,
                element: <ComingSoonPage title="Rezerwacje" milestone="M11" />,
              },
              {
                path: paths.panel.rooms,
                element: <ComingSoonPage title="Pokoje i domki" milestone="M11" />,
              },
              {
                path: paths.panel.roomNew,
                element: <ComingSoonPage title="Nowy pokój" milestone="M11" />,
              },
              {
                path: paths.panel.room,
                element: <ComingSoonPage title="Edycja pokoju" milestone="M11" />,
              },
              {
                path: paths.panel.guests,
                element: <ComingSoonPage title="Goście" milestone="M11" />,
              },
              {
                path: paths.panel.settings,
                element: <ComingSoonPage title="Ustawienia obiektu" milestone="M11" />,
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['ADMIN']} />,
        children: [
          {
            path: paths.admin.root,
            lazy: async () => ({
              Component: (await import('./layouts/admin-layout')).AdminLayout,
            }),
            children: [
              { index: true, element: <Navigate to={routes.admin.owners()} replace /> },
              {
                path: paths.admin.owners,
                element: <ComingSoonPage title="Właściciele" milestone="M13" />,
              },
              {
                path: paths.admin.properties,
                element: <ComingSoonPage title="Obiekty" milestone="M13" />,
              },
              {
                path: paths.admin.emailLogs,
                element: <ComingSoonPage title="Logi e-maili" milestone="M13" />,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const appRoutes: RouteObject[] = [
  {
    hydrateFallbackElement: <FullPageLoader />,
    errorElement: <RouteErrorPage />,
    children: areaRoutes,
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
