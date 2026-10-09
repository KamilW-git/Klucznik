import type { ReservationDto, ReservationPageDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { PROPERTY_ID, reservation, RESERVATION_ID } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

/** Ostatnie parametry `GET /reservations`. */
function captureListParams() {
  const calls: URLSearchParams[] = [];
  server.use(
    http.get(api('/reservations'), ({ request }) => {
      calls.push(new URL(request.url).searchParams);
      return HttpResponse.json<ReservationPageDto>({
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });
    }),
  );
  return calls;
}

describe('ReservationsPage (O4)', () => {
  it('lists reservations of the current property', async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get(api('/reservations'), ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json<ReservationPageDto>({
          data: [reservation],
          meta: { page: 1, pageSize: 20, totalItems: 134, totalPages: 7 },
        });
      }),
    );
    renderAsOwner('/panel/rezerwacje');

    const row = await screen.findByRole('row', { name: /KL-2026-000123, Anna Kowalska/ });
    // Intl: twarde spacje w „1 640 zł”.
    expect(row).toHaveTextContent(/1\s640\szł/);
    expect(within(row).getByText('Oczekuje')).toBeVisible();
    expect(screen.getByText(/1–20 z 134 rezerwacji/)).toBeVisible();
    expect(params?.get('propertyId')).toBe(PROPERTY_ID);
    expect(params?.get('sort')).toBe('checkIn:asc');
  });

  it('filters live in the URL: status chips, search (debounced), clear', async () => {
    const calls = captureListParams();
    const { router } = renderAsOwner('/panel/rezerwacje');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Oczekuje' }));
    await user.click(screen.getByRole('button', { name: 'Potwierdzona' }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=PENDING%2CCONFIRMED'));
    await waitFor(() => expect(calls.at(-1)?.get('status')).toBe('PENDING,CONFIRMED'));

    await user.type(screen.getByRole('searchbox', { name: 'Szukaj rezerwacji' }), 'Kowal');
    await waitFor(() => expect(calls.at(-1)?.get('q')).toBe('Kowal'));
    expect(router.state.location.search).toContain('q=Kowal');

    expect(
      await screen.findByRole('heading', { name: 'Brak rezerwacji w wybranym filtrze' }),
    ).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Wyczyść filtry' })[0]!);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('searchbox', { name: 'Szukaj rezerwacji' })).toHaveValue('');
  });

  it('no reservations at all → empty state with "Dodaj rezerwację"', async () => {
    captureListParams();
    renderAsOwner('/panel/rezerwacje');

    expect(
      await screen.findByRole('heading', { name: 'Nie masz jeszcze rezerwacji' }),
    ).toBeVisible();
  });

  it('row → drawer under /panel/rezerwacje/:id with details and history', async () => {
    const { router } = renderAsOwner('/panel/rezerwacje?status=PENDING');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('row', { name: /KL-2026-000123/ }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/panel/rezerwacje/${RESERVATION_ID}`),
    );
    expect(router.state.location.search).toBe('?status=PENDING');
    const drawer = await screen.findByRole('dialog', { name: 'Szczegóły rezerwacji' });
    expect(await within(drawer).findByText('Oczekuje na potwierdzenie')).toBeVisible();
    expect(within(drawer).getByText('Przyjedziemy około 17:00.')).toBeVisible();
    expect(within(drawer).getByText('Utworzono rezerwację')).toBeVisible();
    expect(within(drawer).getByRole('button', { name: 'Odrzuć' })).toBeVisible();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel/rezerwacje'));
  });

  it('BR-11: internal note with a stale version → "Ktoś w międzyczasie zmienił…" + refresh', async () => {
    let gets = 0;
    server.use(
      http.get(api('/reservations/:id'), () => {
        gets += 1;
        return HttpResponse.json<ReservationDto>({ ...reservation, version: gets });
      }),
      http.patch(api('/reservations/:id'), () => apiError(409, 'VERSION_CONFLICT')),
    );
    renderAsOwner(`/panel/rezerwacje/${RESERVATION_ID}`);
    const user = userEvent.setup();

    const drawer = await screen.findByRole('dialog', { name: 'Szczegóły rezerwacji' });
    await user.type(
      await within(drawer).findByLabelText(/Notatka wewnętrzna/),
      'Łóżeczko dla dziecka',
    );
    await user.click(within(drawer).getByRole('button', { name: 'Zapisz notatkę' }));

    expect(
      await within(drawer).findByText('Ktoś w międzyczasie zmienił tę rezerwację – odśwież dane'),
    ).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Odśwież dane' }));
    await waitFor(() => expect(gets).toBe(2));
  });

  it('saves the internal note with the current version', async () => {
    let body: unknown;
    server.use(
      http.patch(api('/reservations/:id'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<ReservationDto>({
          ...reservation,
          internalNotes: 'Łóżeczko',
          version: 2,
        });
      }),
    );
    renderAsOwner(`/panel/rezerwacje/${RESERVATION_ID}`);
    const user = userEvent.setup();

    const drawer = await screen.findByRole('dialog', { name: 'Szczegóły rezerwacji' });
    await user.type(await within(drawer).findByLabelText(/Notatka wewnętrzna/), 'Łóżeczko');
    await user.click(within(drawer).getByRole('button', { name: 'Zapisz notatkę' }));

    expect(await screen.findByText('Zapisano notatkę')).toBeVisible();
    expect(body).toEqual({ version: 1, internalNotes: 'Łóżeczko' });
  });

  it('unknown reservation → "Nie znaleziono rezerwacji"', async () => {
    server.use(http.get(api('/reservations/:id'), () => apiError(404, 'NOT_FOUND')));
    renderAsOwner(`/panel/rezerwacje/${RESERVATION_ID}`);

    expect(await screen.findByRole('heading', { name: 'Nie znaleziono rezerwacji' })).toBeVisible();
  });
});
