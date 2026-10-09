import type { RoomDto, RoomListDto, SeasonalRateListDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { PROPERTY_ID, rate, room, ROOM_ID } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

describe('RoomsPage (O6)', () => {
  it('renders room cards with price, capacity and visibility; filter by visibility', async () => {
    renderAsOwner('/panel/pokoje');
    const user = userEvent.setup();

    const sosna = (await screen.findByRole('heading', { name: 'Domek Sosna' })).closest('article')!;
    expect(sosna).toHaveTextContent(/380\szł/);
    expect(sosna).toHaveTextContent('do 4 osób');
    expect(within(sosna).getByRole('switch', { name: 'Widoczny na stronie' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Apartament Pod Dębem' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Ukryte (1)' }));
    expect(screen.queryByRole('heading', { name: 'Domek Sosna' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apartament Pod Dębem' })).toBeVisible();
  });

  it('BR-10: hiding a room with future reservations → error toast', async () => {
    server.use(
      http.patch(api('/rooms/:id'), () => apiError(409, 'HAS_FUTURE_RESERVATIONS', { count: 3 })),
    );
    renderAsOwner('/panel/pokoje');
    const user = userEvent.setup();

    const sosna = (await screen.findByRole('heading', { name: 'Domek Sosna' })).closest('article')!;
    await user.click(within(sosna).getByRole('switch', { name: 'Widoczny na stronie' }));

    expect(
      await screen.findByText('Nie można ukryć pokoju z przyszłymi rezerwacjami'),
    ).toBeVisible();
    expect(screen.getByText('Nie można usunąć – istnieją przyszłe rezerwacje (3).')).toBeVisible();
  });

  it('BR-10: delete blocked by future reservations → count and link to the room reservations', async () => {
    server.use(
      http.delete(api('/rooms/:id'), () => apiError(409, 'HAS_FUTURE_RESERVATIONS', { count: 2 })),
    );
    renderAsOwner('/panel/pokoje');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Więcej akcji: Domek Sosna' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Usuń pokój' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć pokój Domek Sosna?' });
    await user.click(within(dialog).getByRole('button', { name: 'Usuń pokój' }));

    expect(
      await within(dialog).findByText('Nie można usunąć – istnieją przyszłe rezerwacje (2)'),
    ).toBeVisible();
    expect(within(dialog).getByRole('link', { name: 'zobacz rezerwacje pokoju' })).toHaveAttribute(
      'href',
      `/panel/rezerwacje?roomId=${ROOM_ID}&status=PENDING,CONFIRMED`,
    );
  });

  it('no rooms → empty state', async () => {
    server.use(
      http.get(api('/properties/:id/rooms'), () => HttpResponse.json<RoomListDto>({ data: [] })),
    );
    renderAsOwner('/panel/pokoje');

    expect(
      await screen.findByRole('heading', { name: 'Nie masz jeszcze żadnych pokoi' }),
    ).toBeVisible();
  });
});

describe('NewRoomPage', () => {
  it('validates, sends the price in grosze and opens the photos tab', async () => {
    let body: unknown;
    let propertyId: string | undefined;
    server.use(
      http.post(api('/properties/:id/rooms'), async ({ request, params }) => {
        body = await request.json();
        propertyId = String(params['id']);
        return HttpResponse.json<RoomDto>(
          { ...room, id: 'new-room', name: 'Domek Brzoza' },
          { status: 201 },
        );
      }),
    );
    const { router } = renderAsOwner('/panel/pokoje/nowy');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Dodaj pokój' }));
    expect(await screen.findByText('Podaj nazwę pokoju.')).toBeVisible();
    expect(screen.getByText('Podaj kwotę.')).toBeVisible();

    await user.type(screen.getByLabelText(/^Nazwa/), 'Domek Brzoza');
    await user.type(screen.getByLabelText(/Cena bazowa za noc/), '580,50');
    await user.click(screen.getByRole('button', { name: 'Dodaj pokój' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/panel/pokoje/new-room/zdjecia'),
    );
    expect(propertyId).toBe(PROPERTY_ID);
    expect(body).toEqual({
      name: 'Domek Brzoza',
      description: null,
      capacity: 2,
      isActive: true,
      basePricePerNight: 58_050,
      minNights: 1,
    });
  });
});

describe('RoomEditPage (O7)', () => {
  it('tabs live in the URL; unknown tab → Informacje', async () => {
    const { router } = renderAsOwner(`/panel/pokoje/${ROOM_ID}/nieznana`);
    const user = userEvent.setup();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/panel/pokoje/${ROOM_ID}/informacje`),
    );
    expect(await screen.findByRole('heading', { name: 'Informacje o pokoju' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Cennik/ }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/panel/pokoje/${ROOM_ID}/cennik`),
    );
    expect(await screen.findByRole('heading', { name: 'Stawki sezonowe' })).toBeVisible();
  });

  it('info tab: sticky save bar sends only the form fields', async () => {
    let body: unknown;
    server.use(
      http.patch(api('/rooms/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<RoomDto>({ ...room, name: 'Domek Sosna Plus' });
      }),
    );
    renderAsOwner(`/panel/pokoje/${ROOM_ID}/informacje`);
    const user = userEvent.setup();

    const name = await screen.findByLabelText(/^Nazwa/);
    await user.clear(name);
    await user.type(name, 'Domek Sosna Plus');
    const bar = await screen.findByRole('region', { name: 'Niezapisane zmiany' });
    await user.click(within(bar).getByRole('button', { name: 'Zapisz zmiany' }));

    expect(await screen.findByText('Zapisano zmiany pokoju')).toBeVisible();
    expect(body).toEqual({
      name: 'Domek Sosna Plus',
      description: 'Całoroczny domek z kominkiem.',
      capacity: 4,
      isActive: true,
    });
  });

  it('BR-09: overlapping seasonal rate → message with the conflicting rate name', async () => {
    server.use(
      http.get(api('/rooms/:id/rates'), () =>
        HttpResponse.json<SeasonalRateListDto>({ data: [rate] }),
      ),
      http.post(api('/rooms/:id/rates'), () =>
        apiError(409, 'SEASONAL_RATE_OVERLAP', {
          conflictingRateId: rate.id,
          conflictingRateName: rate.name,
        }),
      ),
    );
    renderAsOwner(`/panel/pokoje/${ROOM_ID}/cennik`);
    const user = userEvent.setup();

    expect(await screen.findByRole('cell', { name: /Wysoki sezon/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Dodaj stawkę sezonową' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nowa stawka sezonowa' });
    await user.type(within(dialog).getByLabelText(/^Nazwa/), 'Długi weekend');
    await user.click(within(dialog).getByRole('button', { name: /Noce objęte stawką/ }));
    const grid = (await screen.findAllByRole('grid'))[0]!;
    const day = within(grid)
      .getAllByRole('button')
      .find((button) => button.textContent === '15')!;
    await user.click(day);
    await user.click(day);
    await user.type(within(dialog).getByLabelText(/Cena za noc/), '450');
    await user.click(within(dialog).getByRole('button', { name: 'Dodaj stawkę' }));

    expect(
      await within(dialog).findByText('Ta stawka nakłada się na stawkę „Wysoki sezon”.'),
    ).toBeVisible();
  });

  it('blocks tab: lists upcoming blocks and deletes one after confirmation', async () => {
    let deleted: string | undefined;
    server.use(
      http.get(api('/rooms/:id/blocks'), () =>
        HttpResponse.json({
          data: [
            {
              id: 'b1',
              roomId: ROOM_ID,
              dateFrom: '2026-11-20',
              dateTo: '2026-11-22',
              reason: 'Remont łazienki',
              createdAt: '2026-10-01T10:00:00.000Z',
            },
          ],
        }),
      ),
      http.delete(api('/blocks/:id'), ({ params }) => {
        deleted = String(params['id']);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderAsOwner(`/panel/pokoje/${ROOM_ID}/blokady`);
    const user = userEvent.setup();

    expect(await screen.findByText('Remont łazienki')).toBeVisible();
    expect(screen.getByText(/20\.11\.2026 – 22\.11\.2026/)).toHaveTextContent('(3 noce)');
    await user.click(screen.getByRole('button', { name: 'Usuń blokadę 20.11.2026 – 22.11.2026' }));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć blokadę?' });
    await user.click(within(dialog).getByRole('button', { name: 'Usuń blokadę' }));

    expect(await screen.findByText('Usunięto blokadę – termin jest znowu dostępny')).toBeVisible();
    expect(deleted).toBe('b1');
  });
});
