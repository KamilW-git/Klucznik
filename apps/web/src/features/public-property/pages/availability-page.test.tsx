import type { AvailabilityResultDto, ErrorResponseDto } from '@klucznik/api-client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw';
import { describe, expect, it } from 'vitest';

import { availabilityResult, publicRoom, publicRoom2, ROOM_ID, STAY } from '@/test/fixtures';
import { api, apiError } from '@/test/msw/handlers/auth';
import { server } from '@/test/msw/server';
import { searchForm, setupPublicTestDate } from '@/test/public';
import { renderApp } from '@/test/render';

const RESULTS = `/o/lesna-polana/dostepnosc?checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}&guests=${STAY.guests}`;

describe('AvailabilityPage (P2)', () => {
  setupPublicTestDate();

  it('shows the total price for the stay, the average per night and links to the booking form', async () => {
    let requested: URLSearchParams | undefined;
    server.use(
      http.get(api('/public/properties/:slug/availability'), ({ request }) => {
        requested = new URL(request.url).searchParams;
        return HttpResponse.json(availabilityResult());
      }),
    );
    renderApp(RESULTS);

    expect(await screen.findByRole('heading', { name: /Dostępne pokoje/ })).toHaveTextContent(
      '(1 z 2)',
    );
    expect(requested?.toString()).toBe('checkIn=2027-08-14&checkOut=2027-08-18&guests=2');
    const summary = screen.getByRole('region', { name: 'Wyszukiwany pobyt' });
    expect(summary).toHaveTextContent('14.08.2027 – 18.08.2027');
    expect(summary).toHaveTextContent('(4 noce)');
    expect(summary).toHaveTextContent('2 osoby');

    const sosna = screen.getByRole('article', { name: 'Domek Sosna' });
    expect(sosna).toHaveTextContent(/1\s640\szł za 4 noce/);
    expect(sosna).toHaveTextContent(/\(średnio 410\szł \/ noc\)/);
    expect(within(sosna).getByRole('link', { name: 'Wybierz: Domek Sosna' })).toHaveAttribute(
      'href',
      `/o/lesna-polana/rezerwacja?roomId=${ROOM_ID}&checkIn=2027-08-14&checkOut=2027-08-18&guests=2`,
    );
  });

  it('BR-03: a room below the minimum stay explains it and extends the stay in one click', async () => {
    const { router } = renderApp(RESULTS);
    const user = userEvent.setup();

    const room = await screen.findByRole('article', { name: 'Apartament Pod Dębem' });
    expect(room).toHaveTextContent('W tym terminie minimalny pobyt to 5 nocy.');
    await user.click(within(room).getByRole('button', { name: 'Wydłuż pobyt do 5 nocy' }));

    await waitFor(() =>
      expect(router.state.location.search).toBe('?checkIn=2027-08-14&checkOut=2027-08-19&guests=2'),
    );
  });

  it('nothing available → empty state with reasons (occupied, too many guests)', async () => {
    server.use(
      http.get(api('/public/properties/:slug/availability'), () =>
        HttpResponse.json<AvailabilityResultDto>(
          availabilityResult({
            guests: 3,
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
              {
                room: publicRoom2,
                available: false,
                unavailableReason: 'CAPACITY_EXCEEDED',
                minNights: 5,
                totalPrice: null,
                averagePricePerNight: null,
                breakdown: null,
              },
            ],
          }),
        ),
      ),
    );
    renderApp(RESULTS.replace('guests=2', 'guests=3'));

    expect(
      await screen.findByText('Brak wolnych pokoi w wybranym terminie – spróbuj innych dat'),
    ).toBeVisible();
    expect(screen.getByRole('article', { name: 'Domek Sosna' })).toHaveTextContent(
      'Pokój jest zajęty w wybranym terminie.',
    );
    expect(screen.getByRole('article', { name: 'Apartament Pod Dębem' })).toHaveTextContent(
      'Pokój mieści do 2 os., a szukasz miejsca dla 3 osób.',
    );
    expect(screen.queryByRole('link', { name: /Wybierz/ })).not.toBeInTheDocument();
  });

  it('"Zmień" opens the search with the current stay', async () => {
    renderApp(RESULTS);
    const user = userEvent.setup();

    const change = await screen.findByRole('button', { name: 'Zmień' });
    await user.click(change);

    expect(change).toHaveAttribute('aria-expanded', 'true');
    expect(within(searchForm()).getByRole('button', { name: /Termin pobytu/ })).toHaveTextContent(
      '14.08.2027 – 18.08.2027 (4 noce)',
    );
  });

  it('BR-04: arrival in the past (422) → message and change of dates', async () => {
    server.use(
      http.get<PathParams, DefaultBodyType, AvailabilityResultDto | ErrorResponseDto>(
        api('/public/properties/:slug/availability'),
        () => apiError(422, 'INVALID_STAY_DATES', { reason: 'CHECK_IN_IN_PAST' }),
      ),
    );
    renderApp(RESULTS);

    expect(await screen.findByText('Data przyjazdu nie może być w przeszłości.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zmień termin' })).toBeVisible();
  });

  it('missing or invalid stay in the URL → asks for dates', async () => {
    renderApp('/o/lesna-polana/dostepnosc?checkIn=2027-08-18&checkOut=2027-08-14&guests=2');

    expect(await screen.findByText('Wybierz termin pobytu i liczbę gości')).toBeVisible();
    expect(searchForm()).toBeVisible();
  });
});
