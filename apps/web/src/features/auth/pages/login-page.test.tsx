import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { adminUser, api, apiError, authResponse, ownerUser } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderApp } from '@/test/render';

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Adres e-mail/), email);
  await user.type(screen.getByLabelText(/^Hasło/), password);
  await user.click(screen.getByRole('button', { name: 'Zaloguj się' }));
  return user;
}

describe('LoginPage (O1)', () => {
  it('validates the form shape before calling the API', async () => {
    let called = false;
    server.use(
      http.post(api('/auth/login'), () => {
        called = true;
        return HttpResponse.json(authResponse());
      }),
    );
    renderApp('/logowanie');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByText('Podaj adres e-mail.')).toBeVisible();
    expect(screen.getByText('Podaj hasło.')).toBeVisible();
    expect(screen.getByLabelText(/Adres e-mail/)).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText(/Adres e-mail/), 'nie-email');
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }));
    expect(await screen.findByText('Podaj poprawny adres e-mail.')).toBeVisible();
    expect(called).toBe(false);
  });

  it('401 INVALID_CREDENTIALS → alert, password cleared, user stays on the page', async () => {
    server.use(http.post(api('/auth/login'), () => apiError(401, 'INVALID_CREDENTIALS')));
    const { router } = renderApp('/logowanie');

    await fillAndSubmit('jan.nowak@example.com', 'zle-haslo');

    expect(await screen.findByRole('alert')).toHaveTextContent('Nieprawidłowy e-mail lub hasło');
    expect(screen.getByLabelText(/^Hasło/)).toHaveValue('');
    expect(router.state.location.pathname).toBe('/logowanie');
  });

  it('429 RATE_LIMITED → warning about too many attempts', async () => {
    server.use(http.post(api('/auth/login'), () => apiError(429, 'RATE_LIMITED')));
    renderApp('/logowanie');

    await fillAndSubmit('jan.nowak@example.com', 'haslo');

    expect(await screen.findByRole('alert')).toHaveTextContent('Zbyt wiele prób logowania');
  });

  it('VALIDATION_ERROR from the API marks the field', async () => {
    server.use(
      http.post(api('/auth/login'), () =>
        apiError(400, 'VALIDATION_ERROR', {
          fields: [{ field: 'email', messages: ['email must be an email'] }],
        }),
      ),
    );
    renderApp('/logowanie');

    await fillAndSubmit('jan.nowak@example.com', 'haslo');

    expect(await screen.findByText('Nieprawidłowa wartość. Popraw to pole.')).toBeVisible();
    expect(screen.queryByText('email must be an email')).not.toBeInTheDocument();
  });

  it('sends normalized credentials; OWNER lands on /panel', async () => {
    let body: unknown;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse(ownerUser));
      }),
    );
    const { router } = renderApp('/logowanie');

    await fillAndSubmit('  jan.nowak@example.com ', 'tajne-haslo');

    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
    expect(body).toEqual({ email: 'jan.nowak@example.com', password: 'tajne-haslo' });
    expect(await screen.findByRole('heading', { name: 'Pulpit' })).toBeVisible();
  });

  it('ADMIN lands on /admin/wlasciciele', async () => {
    server.use(http.post(api('/auth/login'), () => HttpResponse.json(authResponse(adminUser))));
    const { router } = renderApp('/logowanie');

    await fillAndSubmit('admin@example.com', 'tajne-haslo');

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/wlasciciele'));
  });

  it('returns to ?next= after login, but never to an external address', async () => {
    server.use(http.post(api('/auth/login'), () => HttpResponse.json(authResponse(ownerUser))));
    const { router } = renderApp('/logowanie?next=%2Fpanel%2Fkalendarz');
    await fillAndSubmit('jan.nowak@example.com', 'tajne-haslo');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel/kalendarz'));
  });

  it('ignores an external ?next=', async () => {
    server.use(http.post(api('/auth/login'), () => HttpResponse.json(authResponse(ownerUser))));
    const { router } = renderApp('/logowanie?next=%2F%2Fevil.example.com');
    await fillAndSubmit('jan.nowak@example.com', 'tajne-haslo');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
  });

  it('password visibility toggle', async () => {
    renderApp('/logowanie');
    const user = userEvent.setup();
    const password = await screen.findByLabelText(/^Hasło/);

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Pokaż hasło' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ukryj hasło' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
