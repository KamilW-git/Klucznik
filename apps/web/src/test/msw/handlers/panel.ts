import type {
  GuestPageDto,
  PropertyListDto,
  ReservationPageDto,
  RoomListDto,
  SeasonalRateListDto,
  AvailabilityBlockListDto,
} from '@klucznik/api-client';
import { http, HttpResponse } from 'msw';

import {
  calendar,
  dashboard,
  guest,
  property,
  propertyListItem,
  quote,
  reservation,
  reservationListItem,
  room,
  room2,
} from '../../fixtures';
import { api } from './auth';

const page = <T>(data: T[]) => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 },
});

/** Domyślne odpowiedzi Panelu Gospodarza (jeden obiekt z dwoma pokojami). Testy nadpisują je `server.use`. */
export const panelHandlers = [
  http.get(api('/properties'), () =>
    HttpResponse.json<PropertyListDto>({ data: [propertyListItem] }),
  ),
  http.get(api('/properties/:id'), () => HttpResponse.json(property)),
  http.get(api('/properties/:id/dashboard'), () => HttpResponse.json(dashboard)),
  http.get(api('/properties/:id/rooms'), () =>
    HttpResponse.json<RoomListDto>({ data: [room, room2] }),
  ),
  http.get(api('/properties/:id/calendar'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      calendar(url.searchParams.get('from') ?? '', url.searchParams.get('to') ?? ''),
    );
  }),
  http.get(api('/properties/:id/guests'), () => HttpResponse.json<GuestPageDto>(page([guest]))),
  http.get(api('/reservations'), () =>
    HttpResponse.json<ReservationPageDto>(page([reservationListItem])),
  ),
  http.get(api('/reservations/:id'), () => HttpResponse.json(reservation)),
  http.get(api('/rooms/:id'), () => HttpResponse.json(room)),
  http.get(api('/rooms/:id/quote'), () => HttpResponse.json(quote())),
  http.get(api('/rooms/:id/rates'), () => HttpResponse.json<SeasonalRateListDto>({ data: [] })),
  http.get(api('/rooms/:id/blocks'), () =>
    HttpResponse.json<AvailabilityBlockListDto>({ data: [] }),
  ),
];
