import type { ErrorResponseDto, OwnerDto, OwnerPageDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { describe, expect, it } from 'vitest';

import { blockedOwner, OWNER_ID, ownerDetails, ownerListItem } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsAdmin } from '@/test/render';

const page = (data: OwnerPageDto['data']): OwnerPageDto => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 },
});

const createdOwner: OwnerDto = {
  id: '6f2f7c1e-6d3a-4f0e-9d7a-1b2c3d4e5f99',
  firstName: 'Tomasz',
  lastName: 'Adamczyk',
  email: 'tomasz@example.com',
  isActive: true,
  propertiesCount: 1,
  reservationsLast30Days: 0,
  createdAt: '2026-10-16T10:00:00.000Z',
  properties: [
    {
      id: '11111111-1111-4111-8111-111111111199',
      name: 'Mazurska Przystań',
      slug: 'mazurska-przystan',
      isActive: true,
    },
  ],
};

async function openCreateDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Nowy właściciel' }));
  const dialog = await screen.findByRole('dialog', { name: 'Nowy właściciel' });
  return { user, dialog };
}

describe('OwnersPage (A1)', () => {
  it('lists owners with status and counters; search and status filter go to the API', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(api('/admin/owners'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([ownerListItem, blockedOwner]));
      }),
    );
    renderAsAdmin('/admin/wlasciciele');
    const user = userEvent.setup();

    const table = await screen.findByRole('table', { name: 'Właściciele' });
    const jan = (await within(table).findByText('Jan Nowak')).closest('tr')!;
    expect(jan).toHaveTextContent('jan.nowak@example.com');
    expect(jan).toHaveTextContent('Aktywny');
    expect(within(jan).getByRole('link', { name: /1 obiekt: Jan Nowak/ })).toHaveAttribute(
      'href',
      `/admin/obiekty?ownerId=${OWNER_ID}`,
    );
    expect(within(table).getByText('Ewa Zielińska').closest('tr')).toHaveTextContent('Zablokowany');
    expect(requests[0]?.get('sort')).toBe('createdAt:desc');

    await user.type(screen.getByRole('searchbox', { name: 'Szukaj właściciela' }), 'nowak');
    await waitFor(() => expect(requests.at(-1)?.get('q')).toBe('nowak'));

    await user.click(screen.getByRole('button', { name: 'Zablokowani' }));
    await waitFor(() => expect(requests.at(-1)?.get('isActive')).toBe('false'));
  });

  it('creates an owner with a property; the generated password is shown once to hand over', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(api('/admin/owners'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createdOwner, { status: 201 });
      }),
    );
    renderAsAdmin('/admin/wlasciciele');
    const { user, dialog } = await openCreateDialog();

    const password = within(dialog).getByLabelText(/^Hasło tymczasowe/);
    expect((password as HTMLInputElement).value.length).toBeGreaterThanOrEqual(10);
    await user.type(within(dialog).getByLabelText(/^Imię/), 'Tomasz');
    await user.type(within(dialog).getByLabelText(/^Nazwisko/), 'Adamczyk');
    await user.type(within(dialog).getByLabelText(/^Adres e-mail/), 'tomasz@example.com');
    await user.type(within(dialog).getByLabelText(/^Nazwa obiektu/), 'Mazurska Przystań');
    await user.click(within(dialog).getByRole('button', { name: 'Utwórz konto właściciela' }));

    const summary = await screen.findByRole('dialog', { name: 'Konto założone' });
    const generated = (password as HTMLInputElement).value;
    expect(body).toEqual({
      firstName: 'Tomasz',
      lastName: 'Adamczyk',
      email: 'tomasz@example.com',
      password: generated,
      property: { name: 'Mazurska Przystań' },
    });
    expect(within(summary).getByText('tomasz@example.com')).toBeVisible();
    expect(within(summary).getByText(generated)).toBeVisible();
    expect(within(summary).getByRole('link', { name: /\/o\/mazurska-przystan/ })).toHaveAttribute(
      'href',
      '/o/mazurska-przystan',
    );
  });

  it('validates the form and sends no property when the option is off', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(api('/admin/owners'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...createdOwner, properties: [] }, { status: 201 });
      }),
    );
    renderAsAdmin('/admin/wlasciciele');
    const { user, dialog } = await openCreateDialog();

    const password = within(dialog).getByLabelText(/^Hasło tymczasowe/);
    await user.clear(password);
    await user.type(password, 'krotkie');
    await user.click(within(dialog).getByRole('button', { name: 'Utwórz konto właściciela' }));
    expect(await within(dialog).findByText('Podaj imię.')).toBeVisible();
    expect(within(dialog).getByText('Podaj adres e-mail.')).toBeVisible();
    expect(within(dialog).getByText('Hasło musi mieć co najmniej 10 znaków.')).toBeVisible();
    expect(within(dialog).getByText('Podaj nazwę obiektu.')).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Generuj' }));
    await user.type(within(dialog).getByLabelText(/^Imię/), 'Tomasz');
    await user.type(within(dialog).getByLabelText(/^Nazwisko/), 'Adamczyk');
    await user.type(within(dialog).getByLabelText(/^Adres e-mail/), 'tomasz@example.com');
    await user.click(within(dialog).getByRole('checkbox', { name: /Utwórz od razu obiekt/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Utwórz konto właściciela' }));

    await screen.findByRole('dialog', { name: 'Konto założone' });
    expect(body).not.toHaveProperty('property');
  });

  it('EMAIL_TAKEN (409) is shown at the e-mail field', async () => {
    server.use(
      http.post<PathParams, DefaultBodyType, OwnerDto | ErrorResponseDto>(
        api('/admin/owners'),
        () => apiError(409, 'EMAIL_TAKEN'),
      ),
    );
    renderAsAdmin('/admin/wlasciciele');
    const { user, dialog } = await openCreateDialog();

    await user.type(within(dialog).getByLabelText(/^Imię/), 'Jan');
    await user.type(within(dialog).getByLabelText(/^Nazwisko/), 'Nowak');
    await user.type(within(dialog).getByLabelText(/^Adres e-mail/), 'jan.nowak@example.com');
    await user.type(within(dialog).getByLabelText(/^Nazwa obiektu/), 'Drugi obiekt');
    await user.click(within(dialog).getByRole('button', { name: 'Utwórz konto właściciela' }));

    expect(await within(dialog).findByText('Ten adres e-mail jest już używany.')).toBeVisible();
    expect(within(dialog).getByLabelText(/^Adres e-mail/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('edit sends only changed fields and lists the owner properties', async () => {
    let body: unknown;
    server.use(
      http.patch(api('/admin/owners/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<OwnerDto>({ ...ownerDetails, lastName: 'Nowak-Kowalski' });
      }),
    );
    renderAsAdmin('/admin/wlasciciele');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Edytuj: Jan Nowak' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edycja: Jan Nowak' });
    expect(await within(dialog).findByText('Domki Leśna Polana')).toBeVisible();
    const lastName = within(dialog).getByLabelText(/^Nazwisko/);
    await user.clear(lastName);
    await user.type(lastName, 'Nowak-Kowalski');
    await user.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));

    expect(await screen.findByText('Zapisano zmiany')).toBeVisible();
    expect(body).toEqual({ lastName: 'Nowak-Kowalski' });
  });

  it('blocks an active owner and unblocks a blocked one after confirmation (PATCH isActive)', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(api('/admin/owners/:id'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(ownerDetails);
      }),
    );
    renderAsAdmin('/admin/wlasciciele');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Zablokuj: Jan Nowak' }));
    const block = await screen.findByRole('dialog', { name: 'Zablokować konto?' });
    expect(block).toHaveTextContent('wszystkie aktywne sesje tego konta zostaną zakończone');
    expect(block).toHaveTextContent('Obiekty właściciela nadal przyjmują rezerwacje online'); // Q-10
    await user.click(within(block).getByRole('button', { name: 'Zablokuj konto' }));
    expect(await screen.findByText('Zablokowano konto: Jan Nowak')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Odblokuj: Ewa Zielińska' }));
    const unblock = await screen.findByRole('dialog', { name: 'Odblokować konto?' });
    await user.click(within(unblock).getByRole('button', { name: 'Odblokuj konto' }));
    expect(await screen.findByText('Odblokowano konto: Ewa Zielińska')).toBeVisible();

    expect(bodies).toEqual([{ isActive: false }, { isActive: true }]);
  });
});
