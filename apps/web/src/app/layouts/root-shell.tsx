import { Outlet, ScrollRestoration } from 'react-router';

/** Korzeń tras: przewijanie na górę przy zmianie strony i do kotwicy (`#pokoje`) w adresie. */
export function RootShell() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
