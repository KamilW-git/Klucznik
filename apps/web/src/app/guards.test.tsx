import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { adminUser, api, authResponse, ownerUser } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderApp } from '@/test/render';

const sessionFor = (user = ownerUser) =>
  http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse(user)));

describe('route protection and session bootstrap', () => {
  it('without a session /panel/rezerwacje → /logowanie?next=…', async () => {
    const { router } = renderApp('/panel/rezerwacje?status=PENDING');

    await waitFor(() => expect(router.state.location.pathname).toBe('/logowanie'));
    expect(router.state.location.search).toBe('?next=%2Fpanel%2Frezerwacje%3Fstatus%3DPENDING');
    expect(await screen.findByRole('heading', { name: 'Witaj ponownie' })).toBeVisible();
    // Pierwsze wejście bez sesji to nie „wygaśnięcie”.
    expect(screen.queryByText('Sesja wygasła')).not.toBeInTheDocument();
  });

  it('a valid refresh cookie restores the session after reload (bootstrap)', async () => {
    server.use(sessionFor(ownerUser));
    const { router } = renderApp('/panel/kalendarz');

    expect(await screen.findByRole('heading', { name: 'Kalendarz obłożenia' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/panel/kalendarz');
    expect(screen.getByText('Jan Nowak')).toBeVisible();
  });

  it('OWNER on /admin is sent to /panel (RequireRole)', async () => {
    server.use(sessionFor(ownerUser));
    const { router } = renderApp('/admin/wlasciciele');

    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
  });

  it('ADMIN may open /admin and /panel', async () => {
    server.use(sessionFor(adminUser));
    const { router } = renderApp('/admin');

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/wlasciciele'));
    await router.navigate('/panel');
    expect(await screen.findByRole('heading', { name: /Dzień dobry/ })).toBeVisible();
  });

  it('a logged-in user on /logowanie goes to their panel; / redirects by role', async () => {
    server.use(sessionFor(ownerUser));
    const { router } = renderApp('/logowanie');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));

    await router.navigate('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
  });

  it('logout → POST /auth/logout and /logowanie without next', async () => {
    let loggedOut = false;
    server.use(
      sessionFor(ownerUser),
      http.post(api('/auth/logout'), () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderApp('/panel/goscie');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Menu użytkownika/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Wyloguj się' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/logowanie'));
    expect(router.state.location.search).toBe('');
    expect(loggedOut).toBe(true);
  });

  it('a 401 the refresh cannot fix ends the session with "Sesja wygasła"', async () => {
    let refreshes = 0;
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshes += 1;
        return refreshes === 1
          ? HttpResponse.json(authResponse(ownerUser))
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 });
      }),
      http.get(api('/auth/me'), () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
    );
    const { router } = renderApp('/panel');
    await screen.findByRole('heading', { name: /Dzień dobry/ });

    // Dowolne żądanie z wygasłym tokenem: refresh się nie udaje → wylogowanie lokalne.
    const { authMe } = await import('@klucznik/api-client');
    await authMe().catch(() => undefined);

    await waitFor(() => expect(router.state.location.pathname).toBe('/logowanie'));
    expect(router.state.location.search).toBe('?next=%2Fpanel');
    expect(await screen.findByText('Sesja wygasła')).toBeVisible();
  });

  it('unknown path → 404 page', async () => {
    renderApp('/nie-ma-takiej-strony');
    expect(await screen.findByRole('heading', { name: 'Nie znaleziono strony' })).toBeVisible();
  });
});
