import type { PublicOccupancyDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROOM_2_ID, ROOM_ID } from '@/test/fixtures';
import { api } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { findDay, searchForm, setupPublicTestDate } from '@/test/public';
import { renderApp } from '@/test/render';

describe('PropertyPage (P1)', () => {
  setupPublicTestDate();

  it('shows the property brand, rooms with "from" prices, rules, contact and the page title', async () => {
    renderApp('/o/lesna-polana');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Domki Leśna Polana' }),
    ).toBeVisible();
    // Marka obiektu w nagłówku (white-label) i stopka Klucznika.
    expect(
      screen.getByRole('link', { name: 'Domki Leśna Polana – strona główna obiektu' }),
    ).toBeVisible();
    expect(screen.getByText(/Rezerwacje obsługuje/)).toBeVisible();

    const rooms = screen.getByRole('region', { name: 'Pokoje i domki' });
    const sosna = within(rooms).getByRole('article', { name: 'Domek Sosna' });
    expect(sosna).toHaveTextContent('do 4 osób');
    expect(sosna).toHaveTextContent('min. 2 noce');
    expect(sosna).toHaveTextContent(/380\szł\s\/ noc/);
    expect(within(rooms).getByRole('article', { name: 'Apartament Pod Dębem' })).toHaveTextContent(
      /420\szł/,
    );

    const location = screen.getByRole('region', { name: 'Lokalizacja i zasady' });
    expect(location).toHaveTextContent('ul. Leśna 14, 11-700 Mrągowo');
    expect(location).toHaveTextContent('od 15:00');
    expect(location).toHaveTextContent('Bezpłatne anulowanie do 7 dni przed przyjazdem');
    expect(location).toHaveTextContent('w ciągu 48 godzin');
    expect(within(location).getByRole('link', { name: /Pokaż na mapie/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: '+48 601 234 567' })).toHaveAttribute(
      'href',
      'tel:+48601234567',
    );
    expect(document.title).toBe('Domki Leśna Polana – Mrągowo');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Kameralne domki nad jeziorem, w ciszy mazurskiego lasu.',
    );
  });

  it('search requires dates, then goes to the results (P2) with the stay in the URL', async () => {
    const { router } = renderApp('/o/lesna-polana');
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 1, name: 'Domki Leśna Polana' });
    const form = searchForm();

    await user.click(within(form).getByRole('button', { name: /Sprawdź dostępność/ }));
    expect(within(form).getByText('Wybierz dzień przyjazdu i wyjazdu.')).toBeVisible();

    await user.click(within(form).getByRole('button', { name: /Termin pobytu/ }));
    await user.click(await findDay('14'));
    await user.click(await findDay('18'));
    await user.click(within(form).getByRole('button', { name: 'Zwiększ' }));
    await user.click(within(form).getByRole('button', { name: /Sprawdź dostępność/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/o/lesna-polana/dostepnosc'));
    expect(router.state.location.search).toBe('?checkIn=2027-08-14&checkOut=2027-08-18&guests=3');
    expect(await screen.findByRole('heading', { name: /Dostępne pokoje/ })).toBeVisible();
  });

  it('"Zobacz terminy" shows occupied nights of the room and goes to prices', async () => {
    server.use(
      http.get(api('/public/properties/:slug/occupancy'), ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json<PublicOccupancyDto>({
          from: url.searchParams.get('from') ?? '',
          to: url.searchParams.get('to') ?? '',
          rooms: [
            { roomId: ROOM_ID, occupiedNights: ['2027-08-10', '2027-08-11'] },
            { roomId: ROOM_2_ID, occupiedNights: [] },
          ],
        });
      }),
    );
    const { router } = renderApp('/o/lesna-polana');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Zobacz terminy: Domek Sosna' }));
    const dialog = await screen.findByRole('dialog', { name: 'Terminy: Domek Sosna' });
    await waitFor(async () => expect(await findDay('10', dialog)).toBeDisabled());

    await user.click(await findDay('12', dialog));
    await user.click(await findDay('15', dialog));
    await user.click(within(dialog).getByRole('button', { name: 'Sprawdź cenę' }));

    await waitFor(() =>
      expect(router.state.location.search).toBe('?checkIn=2027-08-12&checkOut=2027-08-15&guests=2'),
    );
  });

  it('gallery opens a photo preview', async () => {
    renderApp('/o/lesna-polana');
    const user = userEvent.setup();

    const gallery = await screen.findByRole('region', { name: 'Galeria' });
    await user.click(within(gallery).getByRole('button', { name: 'Powiększ: Domek nad jeziorem' }));

    const dialog = await screen.findByRole('dialog', { name: 'Domki Leśna Polana' });
    expect(within(dialog).getByText('Zdjęcie 1 z 1')).toBeVisible();
    expect(within(dialog).getByRole('img', { name: 'Domek nad jeziorem' })).toBeVisible();
  });

  it('unknown or inactive property → "Nie znaleziono obiektu"', async () => {
    renderApp('/o/nieznany-obiekt');

    expect(await screen.findByRole('heading', { name: 'Nie znaleziono obiektu' })).toBeVisible();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});
