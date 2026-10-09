import type { GuestPageDto } from '@klucznik/api-client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { api } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

const emptyPage: GuestPageDto = {
  data: [],
  meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe('GuestsPage', () => {
  it('lists guests; a click opens their reservations', async () => {
    const { router } = renderAsOwner('/panel/goscie');
    const user = userEvent.setup();

    const row = await screen.findByRole('row', { name: /Anna Kowalska, pokaż rezerwacje/ });
    expect(row).toHaveTextContent('anna.kowalska@example.com');
    expect(row).toHaveTextContent('14.08.2025');
    await user.click(row);

    await waitFor(() => expect(router.state.location.pathname).toBe('/panel/rezerwacje'));
    expect(router.state.location.search).toBe('?q=anna.kowalska%40example.com');
  });

  it('search (min. 2 characters) goes to the API and the URL', async () => {
    const queries: (string | null)[] = [];
    server.use(
      http.get(api('/properties/:id/guests'), ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('q'));
        return HttpResponse.json(emptyPage);
      }),
    );
    const { router } = renderAsOwner('/panel/goscie');
    const user = userEvent.setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Szukaj gościa' }), 'Kow');

    await waitFor(() => expect(queries.at(-1)).toBe('Kow'));
    expect(router.state.location.search).toBe('?q=Kow');
    expect(
      await screen.findByRole('heading', { name: 'Brak gości pasujących do wyszukiwania' }),
    ).toBeVisible();
  });

  it('no guests yet → empty state', async () => {
    server.use(http.get(api('/properties/:id/guests'), () => HttpResponse.json(emptyPage)));
    renderAsOwner('/panel/goscie');

    expect(await screen.findByRole('heading', { name: 'Nie masz jeszcze gości' })).toBeVisible();
  });
});
