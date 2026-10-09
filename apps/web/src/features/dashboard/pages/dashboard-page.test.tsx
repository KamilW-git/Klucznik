import type {
  DashboardDto,
  ErrorResponseDto,
  PropertyListDto,
  ReservationDto,
} from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  dashboard,
  PROPERTY_ID,
  propertyListItem,
  reservation,
  RESERVATION_ID,
  secondProperty,
} from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderAsOwner } from '@/test/render';

describe('DashboardPage (O2)', () => {
  it('shows KPIs, pending decisions and upcoming arrivals', async () => {
    renderAsOwner('/panel');

    expect(await screen.findByRole('heading', { name: 'Dzień dobry, Jan!' })).toBeVisible();
    const kpis = await screen.findByRole('region', { name: 'Najważniejsze liczby' });
    expect(
      within(kpis).getByText('Przyjazdy dziś').closest('div')?.parentElement,
    ).toHaveTextContent('2');
    expect(
      within(kpis).getByRole('progressbar', { name: 'Obłożenie w tym miesiącu' }),
    ).toHaveAttribute('aria-valuenow', '72');
    expect(screen.getByRole('button', { name: 'Anna Kowalska' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Marek Lewicki' })).toBeVisible();
    // Licznik oczekujących przy „Rezerwacje” w sidebarze.
    expect(screen.getAllByText('oczekujących na decyzję').length).toBeGreaterThan(0);
  });

  it('confirms a pending request and shows a toast', async () => {
    let confirmedId: string | undefined;
    server.use(
      http.post(api('/reservations/:id/confirm'), ({ params }) => {
        confirmedId = String(params['id']);
        return HttpResponse.json<ReservationDto>({ ...reservation, status: 'CONFIRMED' });
      }),
    );
    renderAsOwner('/panel');

    await userEvent.click(await screen.findByRole('button', { name: 'Potwierdź' }));

    expect(await screen.findByText('Rezerwacja została potwierdzona')).toBeVisible();
    expect(confirmedId).toBe(RESERVATION_ID);
  });

  it('rejects a request with a reason (cancel of PENDING)', async () => {
    let body: unknown;
    server.use(
      http.post(api('/reservations/:id/cancel'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<ReservationDto>({ ...reservation, status: 'CANCELLED' });
      }),
    );
    renderAsOwner('/panel');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Odrzuć' }));
    const dialog = await screen.findByRole('dialog', { name: 'Odrzucić prośbę o rezerwację?' });
    await user.type(within(dialog).getByLabelText(/Powód/), 'Brak wolnego domku');
    await user.click(within(dialog).getByRole('button', { name: 'Odrzuć' }));

    expect(await screen.findByText('Prośba została odrzucona')).toBeVisible();
    expect(body).toEqual({ reason: 'Brak wolnego domku' });
  });

  it('expired request (BR-07) → error toast with an explanation', async () => {
    server.use(
      http.post(api('/reservations/:id/confirm'), () =>
        apiError(409, 'INVALID_STATUS_TRANSITION', {
          from: 'PENDING',
          to: 'CONFIRMED',
          expired: true,
        }),
      ),
    );
    renderAsOwner('/panel');

    await userEvent.click(await screen.findByRole('button', { name: 'Potwierdź' }));

    expect(await screen.findByText('Prośba wygasła przed potwierdzeniem')).toBeVisible();
  });

  it('nothing pending → "Wszystko załatwione"; load error → retry', async () => {
    let calls = 0;
    server.use(
      http.get<PathParams, DefaultBodyType, DashboardDto | ErrorResponseDto>(
        api('/properties/:id/dashboard'),
        () => {
          calls += 1;
          return calls === 1
            ? apiError(500, 'INTERNAL_ERROR')
            : HttpResponse.json<DashboardDto>({
                ...dashboard,
                pendingCount: 0,
                pendingReservations: [],
              });
        },
      ),
    );
    renderAsOwner('/panel');

    const retry = await screen.findByRole('button', { name: 'Spróbuj ponownie' });
    await userEvent.click(retry);

    expect(await screen.findByText('Wszystko załatwione')).toBeVisible();
  });

  it('property switcher: remembers the choice and loads the other property', async () => {
    const requested: string[] = [];
    server.use(
      http.get(api('/properties'), () =>
        HttpResponse.json<PropertyListDto>({ data: [propertyListItem, secondProperty] }),
      ),
      http.get(api('/properties/:id/dashboard'), ({ params }) => {
        requested.push(String(params['id']));
        return HttpResponse.json(dashboard);
      }),
    );
    renderAsOwner('/panel');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /Zmień obiekt \(aktywny: Domki Leśna Polana\)/ }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /Pensjonat Pod Lipami/ }));

    await waitFor(() => expect(requested).toContain(secondProperty.id));
    expect(requested[0]).toBe(PROPERTY_ID);
    expect(localStorage.getItem('kl.currentPropertyId')).toBe(secondProperty.id);
    localStorage.clear();
  });

  it('an owner without properties sees "contact the administrator"', async () => {
    server.use(
      http.get(api('/properties'), () => HttpResponse.json<PropertyListDto>({ data: [] })),
    );
    renderAsOwner('/panel');

    expect(await screen.findByRole('heading', { name: 'Nie masz jeszcze obiektu' })).toBeVisible();
    expect(screen.getByText(/Skontaktuj się z administratorem/)).toBeVisible();
  });
});
