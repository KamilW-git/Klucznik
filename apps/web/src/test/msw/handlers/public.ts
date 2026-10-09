import type {
  PublicOccupancyDto,
  PublicReservationCreatedDto,
  PublicReservationDto,
} from '@klucznik/api-client';
import { http, HttpResponse } from 'msw';

import {
  availabilityResult,
  GUEST_TOKEN,
  PUBLIC_SLUG,
  publicProperty,
  publicReservation,
  reservationCreated,
} from '../../fixtures';
import { api, apiError } from './auth';

/** Domyślne odpowiedzi strony publicznej (obiekt `lesna-polana`, token `GUEST_TOKEN`). */
export const publicHandlers = [
  http.get(api('/public/properties/:slug'), ({ params }) =>
    params['slug'] === PUBLIC_SLUG ? HttpResponse.json(publicProperty) : apiError(404, 'NOT_FOUND'),
  ),
  http.get(api('/public/properties/:slug/availability'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      availabilityResult({
        checkIn: url.searchParams.get('checkIn') ?? '',
        checkOut: url.searchParams.get('checkOut') ?? '',
        guests: Number(url.searchParams.get('guests')),
      }),
    );
  }),
  http.get(api('/public/properties/:slug/occupancy'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json<PublicOccupancyDto>({
      from: url.searchParams.get('from') ?? '',
      to: url.searchParams.get('to') ?? '',
      rooms: publicProperty.rooms.map((room) => ({ roomId: room.id, occupiedNights: [] })),
    });
  }),
  http.post(api('/public/properties/:slug/reservations'), () =>
    HttpResponse.json<PublicReservationCreatedDto>(reservationCreated, { status: 201 }),
  ),
  http.get(api('/public/reservations/:token'), ({ params }) =>
    params['token'] === GUEST_TOKEN
      ? HttpResponse.json(publicReservation)
      : apiError(404, 'NOT_FOUND'),
  ),
  http.post(api('/public/reservations/:token/cancel'), () =>
    HttpResponse.json<PublicReservationDto>({
      ...publicReservation,
      status: 'CANCELLED',
      canCancel: false,
      cancellableUntil: null,
      cancelledAt: '2027-08-02T09:30:00.000Z',
    }),
  ),
];
