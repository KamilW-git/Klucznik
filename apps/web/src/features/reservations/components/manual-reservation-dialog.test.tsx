import type { GuestPageDto, ReservationDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { guest, PROPERTY_ID, quote, reservation, ROOM_ID } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { MemoryRouter } from 'react-router';

import { ManualReservationDialog } from './manual-reservation-dialog';

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <MemoryRouter>
      <ManualReservationDialog
        propertyId={PROPERTY_ID}
        open={open}
        onOpenChange={setOpen}
        prefill={{ roomId: ROOM_ID, checkIn: '2026-12-01', checkOut: '2026-12-05' }}
      />
      {!open && <p>Dialog zamknięty</p>}
    </MemoryRouter>
  );
}

describe('ManualReservationDialog (O5)', () => {
  it('shows the price from quote (BR-05) and creates a reservation for an existing guest', async () => {
    let body: unknown;
    server.use(
      http.get(api('/properties/:id/guests'), () =>
        HttpResponse.json<GuestPageDto>({
          data: [guest],
          meta: { page: 1, pageSize: 8, totalItems: 1, totalPages: 1 },
        }),
      ),
      http.post(api('/properties/:id/reservations'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<ReservationDto>(
          { ...reservation, status: 'CONFIRMED', source: 'MANUAL' },
          { status: 201 },
        );
      }),
    );
    renderWithProviders(<Harness />);
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Nowa rezerwacja' });

    const price = await within(dialog).findByRole('region', { name: 'Cena wyliczona' });
    expect(price).toHaveTextContent(/1\s520\szł/);
    expect(price).toHaveTextContent('4 noce');

    await user.type(within(dialog).getByRole('combobox', { name: 'Wyszukaj gościa' }), 'Kowal');
    await user.click(await within(dialog).findByRole('option', { name: /Anna Kowalska/ }));
    expect(within(dialog).getByText('Anna Kowalska (anna.kowalska@example.com)')).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Dodaj rezerwację' }));

    expect(await screen.findByText('Dialog zamknięty')).toBeVisible();
    expect(body).toEqual({
      roomId: ROOM_ID,
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      guestsCount: 2,
      guest: { id: guest.id },
      guestNotes: null,
      internalNotes: null,
      ignoreMinNights: false,
    });
  });

  it('BR-01: occupied term → conflict with the reservation number, submit disabled', async () => {
    server.use(
      http.get(api('/rooms/:id/quote'), () =>
        HttpResponse.json(
          quote({
            available: false,
            unavailableReason: 'OCCUPIED',
            conflicts: [
              {
                type: 'RESERVATION',
                id: reservation.id,
                number: 'KL-2026-000118',
                dateFrom: '2026-12-02',
                dateTo: '2026-12-06',
              },
            ],
          }),
        ),
      ),
    );
    renderWithProviders(<Harness />);
    const dialog = await screen.findByRole('dialog', { name: 'Nowa rezerwacja' });

    expect(await within(dialog).findByText('Wykryto kolizję – termin jest zajęty')).toBeVisible();
    expect(within(dialog).getByRole('link', { name: 'KL-2026-000118' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Dodaj rezerwację' })).toBeDisabled();
  });

  it('BR-03 with Q-01: a shorter stay can be accepted explicitly', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.get(api('/rooms/:id/quote'), () =>
        HttpResponse.json(
          quote({ available: false, unavailableReason: 'MIN_NIGHTS_NOT_MET', minNights: 5 }),
        ),
      ),
      http.post(api('/properties/:id/reservations'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json<ReservationDto>(reservation, { status: 201 });
      }),
    );
    renderWithProviders(<Harness />);
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Nowa rezerwacja' });

    expect(await within(dialog).findByText('Minimalny pobyt w tym terminie: 5 nocy')).toBeVisible();
    const submit = within(dialog).getByRole('button', { name: 'Dodaj rezerwację' });
    expect(submit).toBeDisabled();

    await user.click(within(dialog).getByLabelText('Przyjmij krótszy pobyt mimo minimum'));
    await user.click(within(dialog).getByRole('button', { name: 'Dodaj nowego gościa' }));
    await user.type(within(dialog).getByLabelText(/^Imię/), 'Jan');
    await user.type(within(dialog).getByLabelText(/^Nazwisko/), 'Telefoniczny');
    await user.click(submit);

    await waitFor(() => expect(body['ignoreMinNights']).toBe(true));
    expect(body['guest']).toEqual({
      firstName: 'Jan',
      lastName: 'Telefoniczny',
      email: null,
      phone: null,
    });
  });

  it('requires a guest and validates the new guest e-mail', async () => {
    renderWithProviders(<Harness />);
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Nowa rezerwacja' });
    await within(dialog).findByRole('region', { name: 'Cena wyliczona' });

    await user.click(within(dialog).getByRole('button', { name: 'Dodaj rezerwację' }));
    expect(
      await within(dialog).findByText('Wybierz gościa z listy albo dodaj nowego.'),
    ).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Dodaj nowego gościa' }));
    await user.type(within(dialog).getByLabelText(/^E-mail/), 'nie-email');
    await user.click(within(dialog).getByRole('button', { name: 'Dodaj rezerwację' }));
    expect(await within(dialog).findByText('Podaj poprawny adres e-mail.')).toBeVisible();
    expect(within(dialog).getByText('Podaj imię.')).toBeVisible();
  });

  it('a race lost to another booking (409 RESERVATION_OVERLAP) shows an inline alert', async () => {
    server.use(
      http.post(api('/properties/:id/reservations'), () => apiError(409, 'RESERVATION_OVERLAP')),
    );
    renderWithProviders(<Harness />);
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Nowa rezerwacja' });
    await within(dialog).findByRole('region', { name: 'Cena wyliczona' });

    await user.click(within(dialog).getByRole('button', { name: 'Dodaj nowego gościa' }));
    await user.type(within(dialog).getByLabelText(/^Imię/), 'Jan');
    await user.type(within(dialog).getByLabelText(/^Nazwisko/), 'Nowy');
    await user.click(within(dialog).getByRole('button', { name: 'Dodaj rezerwację' }));

    expect(
      await within(dialog).findByText('Ten termin koliduje z inną rezerwacją lub blokadą.'),
    ).toBeVisible();
  });
});
