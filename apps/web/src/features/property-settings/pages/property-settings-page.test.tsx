import type { PropertyDto } from '@klucznik/api-client';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { property } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

async function saveChanges(user: ReturnType<typeof userEvent.setup>) {
  const bar = await screen.findByRole('region', { name: 'Niezapisane zmiany' });
  await user.click(within(bar).getByRole('button', { name: 'Zapisz zmiany' }));
}

describe('PropertySettingsPage (O8)', () => {
  it('sends only changed fields; empty optional text → null', async () => {
    let body: unknown;
    server.use(
      http.patch(api('/properties/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<PropertyDto>({ ...property, phone: null, checkInTime: '14:00' });
      }),
    );
    renderAsOwner('/panel/ustawienia');
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText('Telefon'));
    const checkIn = screen.getByLabelText(/Zameldowanie od/);
    await user.clear(checkIn);
    await user.type(checkIn, '14:00');
    await saveChanges(user);

    expect(await screen.findByText('Zapisano ustawienia obiektu')).toBeVisible();
    expect(body).toEqual({ phone: null, checkInTime: '14:00' });
  });

  it('SLUG_TAKEN is shown at the page address field', async () => {
    server.use(http.patch(api('/properties/:id'), () => apiError(409, 'SLUG_TAKEN')));
    renderAsOwner('/panel/ustawienia');
    const user = userEvent.setup();

    const slug = await screen.findByLabelText(/Adres strony obiektu/);
    await user.clear(slug);
    await user.type(slug, 'pod-lipami');
    expect(screen.getByText('pod-lipami')).toBeVisible(); // podgląd adresu
    await saveChanges(user);

    expect(
      await screen.findByText('Ten adres strony jest już zajęty. Wybierz inny.'),
    ).toBeVisible();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
  });

  it('validates the slug format and the postal code', async () => {
    renderAsOwner('/panel/ustawienia');
    const user = userEvent.setup();

    const slug = await screen.findByLabelText(/Adres strony obiektu/);
    await user.clear(slug);
    await user.type(slug, 'Leśna Polana');
    const postal = screen.getByLabelText(/Kod pocztowy/);
    await user.clear(postal);
    await user.type(postal, '11700');
    await saveChanges(user);

    expect(await screen.findByText(/Tylko małe litery bez polskich znaków/)).toBeVisible();
    expect(screen.getByText('Kod pocztowy w formacie 00-000.')).toBeVisible();
  });

  it('BR-10: turning the property off with future reservations → alert with the count', async () => {
    server.use(
      http.patch(api('/properties/:id'), () =>
        apiError(409, 'HAS_FUTURE_RESERVATIONS', { count: 4 }),
      ),
    );
    renderAsOwner('/panel/ustawienia');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('switch', { name: /Obiekt przyjmuje rezerwacje online/ }),
    );
    await saveChanges(user);

    expect(
      await screen.findByText('Nie można wyłączyć obiektu – istnieją przyszłe rezerwacje (4)'),
    ).toBeVisible();
  });

  it('links to the public page of the property', async () => {
    renderAsOwner('/panel/ustawienia');

    expect(await screen.findByRole('link', { name: 'Podgląd strony obiektu' })).toHaveAttribute(
      'href',
      property.publicUrl,
    );
  });
});
