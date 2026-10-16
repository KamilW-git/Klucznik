import type {
  AdminPropertyPageDto,
  EmailLogPageDto,
  OwnerDto,
  OwnerPageDto,
} from '@klucznik/api-client';
import { http, HttpResponse } from 'msw';

import {
  adminProperty,
  blockedOwner,
  failedEmail,
  inactiveProperty,
  ownerDetails,
  ownerListItem,
  sentEmail,
} from '../../fixtures';
import { api } from './auth';

const page = <T>(data: T[]) => ({
  data,
  meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 },
});

/** Domyślne odpowiedzi panelu admina. Testy nadpisują je `server.use`. */
export const adminHandlers = [
  http.get(api('/admin/owners'), () =>
    HttpResponse.json<OwnerPageDto>(page([ownerListItem, blockedOwner])),
  ),
  http.get(api('/admin/owners/:id'), ({ params }) =>
    HttpResponse.json<OwnerDto>(
      params['id'] === ownerDetails.id ? ownerDetails : { ...blockedOwner, properties: [] },
    ),
  ),
  http.get(api('/admin/properties'), () =>
    HttpResponse.json<AdminPropertyPageDto>(page([adminProperty, inactiveProperty])),
  ),
  http.get(api('/admin/email-logs'), () =>
    HttpResponse.json<EmailLogPageDto>(page([sentEmail, failedEmail])),
  ),
];
