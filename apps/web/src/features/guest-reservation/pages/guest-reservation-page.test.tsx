import type { ErrorResponseDto, PublicReservationDto } from '@klucznik/api-client';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { describe, expect, it } from 'vitest';

import { GUEST_TOKEN, publicReservation } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { setupPublicTestDate } from '@/test/public';
import { renderApp } from '@/test/render';

const getReservation = (reservation: PublicReservationDto) =>
  http.get(api('/public/reservations/:token'), () => HttpResponse.json(reservation));

describe('GuestReservationPage (P5)', () => {
  setupPublicTestDate();

  it('shows the reservation, contact and – before the deadline – free cancellation (BR-08)', async () => {
    renderApp(`/r/${GUEST_TOKEN}`);

    expect(
      await screen.findByRole('heading', { name: 'Twoja rezerwacja jest potwierdzona' }),
    ).toBeVisible();
    expect(screen.getByText('KL-2027-000123')).toBeVisible();
    const details = screen.getByRole('region', { name: 'Szczegóły pobytu' });
    expect(details).toHaveTextContent('14.08.2027 – 18.08.2027');
    expect(details).toHaveTextContent(/1\s640\szł/);
    expect(details).toHaveTextContent('od 15:00');
    expect(screen.getByRole('link', { name: 'Zadzwoń' })).toHaveAttribute(
      'href',
      'tel:+48601234567',
    );
    expect(screen.getByText('Możesz bezpłatnie anulować rezerwację do 07.08.2027.')).toBeVisible();
    // Token jest sekretem: nie trafia do tytułu ani do nagłówka Referer, strona bez indeksowania.
    expect(document.title).toBe('Rezerwacja KL-2027-000123 – Domki Leśna Polana');
    expect(document.title).not.toContain(GUEST_TOKEN);
    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'no-referrer',
    );
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  it('cancels with a reason and shows the cancelled status', async () => {
    let body: unknown;
    server.use(
      http.post(api('/public/reservations/:token/cancel'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json<PublicReservationDto>({
          ...publicReservation,
          status: 'CANCELLED',
          canCancel: false,
          cancellableUntil: null,
          cancelledAt: '2027-08-02T09:30:00.000Z',
        });
      }),
    );
    renderApp(`/r/${GUEST_TOKEN}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Anuluj rezerwację' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anulować rezerwację?' });
    await user.type(within(dialog).getByLabelText(/Powód/), 'Zmiana planów');
    await user.click(within(dialog).getByRole('button', { name: 'Anuluj rezerwację' }));

    expect(
      await screen.findByRole('heading', { name: 'Rezerwacja została anulowana' }),
    ).toBeVisible();
    expect(body).toEqual({ reason: 'Zmiana planów' });
    expect(await screen.findByText('Potwierdzenie wyślemy e-mailem.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Anuluj rezerwację' })).not.toBeInTheDocument();
  });

  it('BR-08: after the deadline → "skontaktuj się z gospodarzem", no cancel button', async () => {
    server.use(getReservation({ ...publicReservation, canCancel: false }));
    renderApp(`/r/${GUEST_TOKEN}`);

    expect(
      await screen.findByText(
        'Termin bezpłatnego anulowania minął – skontaktuj się z gospodarzem.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Anuluj rezerwację' })).not.toBeInTheDocument();
  });

  it('BR-08: the deadline passed while the page was open (422) → message', async () => {
    server.use(
      http.post<PathParams, DefaultBodyType, PublicReservationDto | ErrorResponseDto>(
        api('/public/reservations/:token/cancel'),
        () => apiError(422, 'CANCELLATION_DEADLINE_PASSED', { cancellableUntil: '2027-08-07' }),
      ),
    );
    renderApp(`/r/${GUEST_TOKEN}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Anuluj rezerwację' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anulować rezerwację?' });
    await user.click(within(dialog).getByRole('button', { name: 'Anuluj rezerwację' }));

    expect(
      await within(dialog).findByText(
        'Termin bezpłatnego anulowania minął 07.08.2027 – skontaktuj się z gospodarzem.',
      ),
    ).toBeVisible();
  });

  it('PENDING: the guest can always cancel the request', async () => {
    server.use(getReservation({ ...publicReservation, status: 'PENDING' }));
    renderApp(`/r/${GUEST_TOKEN}`);

    expect(
      await screen.findByRole('heading', { name: 'Czekamy na potwierdzenie gospodarza' }),
    ).toBeVisible();
    expect(
      screen.getByText(/Możesz anulować prośbę, dopóki gospodarz jej nie potwierdzi\./),
    ).toHaveTextContent('Po potwierdzeniu bezpłatne anulowanie będzie możliwe do 07.08.2027.');
  });

  it('unknown or expired link (404) → "Link jest nieaktualny"', async () => {
    renderApp('/r/nieznany-token');

    expect(await screen.findByRole('heading', { name: 'Link jest nieaktualny' })).toBeVisible();
  });
});
