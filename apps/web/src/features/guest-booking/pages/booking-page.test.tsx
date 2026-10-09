import type {
  AvailabilityResultDto,
  ErrorResponseDto,
  PublicReservationCreatedDto,
} from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { describe, expect, it } from 'vitest';

import { availabilityResult, publicRoom, reservationCreated, ROOM_ID, STAY } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { setupPublicTestDate } from '@/test/public';
import { renderApp } from '@/test/render';

const BOOKING = `/o/lesna-polana/rezerwacja?roomId=${ROOM_ID}&checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}&guests=${STAY.guests}`;

async function fillForm(user: UserEvent) {
  const form = await screen.findByRole('form', { name: 'Dane osoby rezerwującej' });
  await user.type(within(form).getByLabelText(/^Imię/), 'Anna');
  await user.type(within(form).getByLabelText(/^Nazwisko/), 'Kowalska');
  await user.type(within(form).getByLabelText(/^Adres e-mail/), 'anna.kowalska@example.com');
  await user.type(within(form).getByLabelText(/^Numer telefonu/), '+48 601 234 567');
  await user.click(within(form).getByRole('checkbox', { name: /Akceptuję warunki rezerwacji/ }));
  return form;
}

const postReservation = (
  respond: () => HttpResponse<PublicReservationCreatedDto | ErrorResponseDto>,
) =>
  http.post<PathParams, DefaultBodyType, PublicReservationCreatedDto | ErrorResponseDto>(
    api('/public/properties/:slug/reservations'),
    respond,
  );

describe('BookingPage (P3) and BookingSentPage (P4)', () => {
  setupPublicTestDate();

  it('shows the summary with the price breakdown from the API and the booking rules', async () => {
    renderApp(BOOKING);

    const summary = await screen.findByRole('complementary', { name: 'Podsumowanie rezerwacji' });
    expect(within(summary).getByRole('heading', { name: 'Domek Sosna' })).toBeVisible();
    expect(summary).toHaveTextContent('14.08.2027 – 18.08.2027');
    expect(summary).toHaveTextContent(/2 noce × 450\szł/);
    expect(summary).toHaveTextContent(/2 noce × 370\szł/);
    expect(summary).toHaveTextContent(/Łącznie za pobyt1\s640\szł/);
    expect(summary).toHaveTextContent('w ciągu 48 godzin');
    expect(summary).toHaveTextContent('Bezpłatne anulowanie do 7 dni przed przyjazdem');
    expect(screen.getByRole('navigation', { name: 'Kroki rezerwacji' })).toHaveTextContent(
      /Termin \(gotowe\)/,
    );
  });

  it('validates the form (zod) before sending', async () => {
    let posted = false;
    server.use(
      postReservation(() => {
        posted = true;
        return HttpResponse.json(reservationCreated, { status: 201 });
      }),
    );
    renderApp(BOOKING);
    const user = userEvent.setup();

    const form = await screen.findByRole('form', { name: 'Dane osoby rezerwującej' });
    await user.type(within(form).getByLabelText(/^Adres e-mail/), 'anna.kowalska@poczta');
    await user.click(within(form).getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(await within(form).findByText('Podaj imię.')).toBeVisible();
    expect(within(form).getByText('Podaj nazwisko.')).toBeVisible();
    expect(
      within(form).getByText('Podaj poprawny adres e-mail, np. anna.kowalska@example.com.'),
    ).toBeVisible();
    expect(within(form).getByText('Podaj numer telefonu.')).toBeVisible();
    expect(within(form).getByText('Zaakceptuj warunki rezerwacji.')).toBeVisible();
    expect(posted).toBe(false);
  });

  it('sends the request without a price (BR-05) and shows the confirmation (P4)', async () => {
    let body: unknown;
    server.use(
      http.post(api('/public/properties/:slug/reservations'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(reservationCreated, { status: 201 });
      }),
    );
    const { router } = renderApp(BOOKING);
    const user = userEvent.setup();

    const form = await fillForm(user);
    await user.click(within(form).getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Dziękujemy! Twoja prośba o rezerwację została wysłana',
      }),
    ).toBeVisible();
    expect(body).toEqual({
      roomId: ROOM_ID,
      checkIn: STAY.checkIn,
      checkOut: STAY.checkOut,
      guestsCount: 2,
      guest: {
        firstName: 'Anna',
        lastName: 'Kowalska',
        email: 'anna.kowalska@example.com',
        phone: '+48 601 234 567',
      },
      guestNotes: null,
    });
    expect(router.state.location.pathname).toBe('/o/lesna-polana/rezerwacja/wyslana');
    expect(screen.getByText('KL-2027-000123')).toBeVisible();
    expect(screen.getByText('Oczekuje na potwierdzenie')).toBeVisible();
    expect(screen.getByText('anna.kowalska@example.com')).toBeVisible();
    expect(screen.getByText('Gospodarz potwierdzi rezerwację w ciągu 48 godzin')).toBeVisible();
    expect(screen.getByText('Domek Sosna')).toBeVisible();
  });

  it('BR-01: the date was taken in the meantime (409) → message and back to the results', async () => {
    let availabilityCalls = 0;
    server.use(
      postReservation(() => apiError(409, 'RESERVATION_OVERLAP')),
      http.get(api('/public/properties/:slug/availability'), () => {
        availabilityCalls += 1;
        return HttpResponse.json(availabilityResult());
      }),
    );
    renderApp(BOOKING);
    const user = userEvent.setup();

    const form = await fillForm(user);
    await user.click(within(form).getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent('Ten termin został właśnie zajęty');
    expect(within(alert).getByRole('link', { name: 'Wróć do wyników' })).toHaveAttribute(
      'href',
      `/o/lesna-polana/dostepnosc?checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}&guests=2`,
    );
    await waitFor(() => expect(availabilityCalls).toBeGreaterThan(1));
  });

  it('422 from the API (e.g. CAPACITY_EXCEEDED) → message in Polish', async () => {
    server.use(postReservation(() => apiError(422, 'CAPACITY_EXCEEDED', { capacity: 4 })));
    renderApp(BOOKING);
    const user = userEvent.setup();

    const form = await fillForm(user);
    await user.click(within(form).getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(
      await within(form).findByText('Za dużo gości dla wybranego pokoju (najwyżej 4 os.).'),
    ).toBeVisible();
  });

  it('a room that is no longer available shows why instead of the form', async () => {
    server.use(
      http.get(api('/public/properties/:slug/availability'), () =>
        HttpResponse.json<AvailabilityResultDto>(
          availabilityResult({
            rooms: [
              {
                room: publicRoom,
                available: false,
                unavailableReason: 'OCCUPIED',
                minNights: 2,
                totalPrice: null,
                averagePricePerNight: null,
                breakdown: null,
              },
            ],
          }),
        ),
      ),
    );
    renderApp(BOOKING);

    expect(await screen.findByText('Ten termin jest już zajęty')).toBeVisible();
    expect(screen.queryByRole('form', { name: 'Dane osoby rezerwującej' })).not.toBeInTheDocument();
  });

  it('P4 without the router state (refresh) → property page', async () => {
    const { router } = renderApp('/o/lesna-polana/rezerwacja/wyslana');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Domki Leśna Polana' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/o/lesna-polana');
  });
});
