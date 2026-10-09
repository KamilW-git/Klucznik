import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RedirectIfAuthenticated, RequireAuth, RequireRole, RootRedirect } from './guards';
import { RootShell } from './layouts/root-shell';
import { ComingSoonPage } from './pages/coming-soon-page';
import { FullPageLoader } from './pages/full-page-loader';
import { NotFoundPage } from './pages/not-found-page';
import { RoomIndexRedirect } from './pages/room-index-redirect';
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
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/dashboard/pages/dashboard-page'))
                    .DashboardPage,
                }),
              },
              {
                path: paths.panel.calendar,
                lazy: async () => ({
                  Component: (await import('@/features/calendar/pages/calendar-page')).CalendarPage,
                }),
              },
              {
                // `/panel/rezerwacje` i `/panel/rezerwacje/:id` (drawer nad listą): jedna trasa,
                // więc lista nie montuje się od nowa przy otwieraniu szczegółów.
                path: paths.panel.reservation,
                lazy: async () => ({
                  Component: (await import('@/features/reservations/pages/reservations-page'))
                    .ReservationsPage,
                }),
              },
              {
                path: paths.panel.rooms,
                lazy: async () => ({ Component: (await import('@/features/rooms')).RoomsPage }),
              },
              {
                path: paths.panel.roomNew,
                lazy: async () => ({ Component: (await import('@/features/rooms')).NewRoomPage }),
              },
              {
                path: `${paths.panel.rooms}/:roomId`,
                element: <RoomIndexRedirect />,
              },
              {
                path: paths.panel.room,
                lazy: async () => ({ Component: (await import('@/features/rooms')).RoomEditPage }),
              },
              {
                path: paths.panel.guests,
                lazy: async () => ({ Component: (await import('@/features/guests')).GuestsPage }),
              },
              {
                path: paths.panel.settings,
                lazy: async () => ({
                  Component: (await import('@/features/property-settings')).PropertySettingsPage,
                }),
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
  {
    // Strona publiczna (P1–P4): bez logowania; layout pobiera obiekt raz dla wszystkich stron.
    path: paths.public.property,
    lazy: async () => ({
      Component: (await import('@/features/public-property/pages/property-layout'))
        .PublicPropertyLayout,
    }),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/features/public-property/pages/property-page')).PropertyPage,
        }),
      },
      {
        path: paths.public.availability,
        lazy: async () => ({
          Component: (await import('@/features/public-property/pages/availability-page'))
            .AvailabilityPage,
        }),
      },
      {
        path: paths.public.booking,
        lazy: async () => ({ Component: (await import('@/features/guest-booking')).BookingPage }),
      },
      {
        path: paths.public.bookingSent,
        lazy: async () => ({
          Component: (await import('@/features/guest-booking')).BookingSentPage,
        }),
      },
    ],
  },
  {
    path: paths.public.reservation,
    lazy: async () => ({
      Component: (await import('@/features/guest-reservation')).GuestReservationPage,
    }),
  },
  { path: '*', element: <NotFoundPage /> },
];

export const appRoutes: RouteObject[] = [
  {
    element: <RootShell />,
    hydrateFallbackElement: <FullPageLoader />,
    errorElement: <RouteErrorPage />,
    children: areaRoutes,
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
