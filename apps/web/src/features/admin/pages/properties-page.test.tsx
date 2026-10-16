import type { AdminPropertyPageDto, OwnerPageDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { adminProperty, inactiveProperty, OWNER_ID, ownerListItem } from '@/test/fixtures';
import { api } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsAdmin } from '@/test/render';

const page = <T,>(data: T[]) => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 },
});

describe('PropertiesPage (admin)', () => {
  it('lists properties with owner; preview only for active properties', async () => {
    renderAsAdmin('/admin/obiekty');

    const table = await screen.findByRole('table', { name: 'Obiekty' });
    const active = (await within(table).findByText('Domki Leśna Polana')).closest('tr')!;
    expect(active).toHaveTextContent('/o/lesna-polana');
    expect(active).toHaveTextContent('Jan Nowak');
    expect(within(active).getByRole('link', { name: /Podgląd/ })).toHaveAttribute(
      'href',
      '/o/lesna-polana',
    );
    const inactive = within(table).getByText('Pensjonat Pod Lipami').closest('tr')!;
    expect(inactive).toHaveTextContent('Nieaktywny');
    expect(within(inactive).queryByRole('link', { name: /Podgląd/ })).not.toBeInTheDocument();
  });

  it('filters by owner chosen in the picker and clears the filter', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(api('/admin/properties'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json<AdminPropertyPageDto>(page([adminProperty, inactiveProperty]));
      }),
      http.get(api('/admin/owners'), () => HttpResponse.json<OwnerPageDto>(page([ownerListItem]))),
    );
    const { router } = renderAsAdmin('/admin/obiekty');
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole('combobox', { name: 'Filtruj po właścicielu' }),
      'nowak',
    );
    await user.click(await screen.findByRole('option', { name: /Jan Nowak/ }));

    await waitFor(() => expect(requests.at(-1)?.get('ownerId')).toBe(OWNER_ID));
    expect(router.state.location.search).toBe(`?ownerId=${OWNER_ID}`);
    const clear = await screen.findByRole('button', { name: 'Wyczyść filtr właściciela' });
    await waitFor(() => expect(clear.parentElement).toHaveTextContent('Właściciel: Jan Nowak'));

    await user.click(screen.getByRole('button', { name: 'Wyczyść filtr właściciela' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('combobox', { name: 'Filtruj po właścicielu' })).toHaveValue('');
  });

  it('a link with ?ownerId= shows the owner name from the API', async () => {
    renderAsAdmin(`/admin/obiekty?ownerId=${OWNER_ID}`);

    const clear = await screen.findByRole('button', { name: 'Wyczyść filtr właściciela' });
    await waitFor(() => expect(clear.parentElement).toHaveTextContent('Właściciel: Jan Nowak'));
  });
});
