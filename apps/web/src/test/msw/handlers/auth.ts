import type { AuthResponseDto, ErrorResponseDto, MeDto } from '@klucznik/api-client';
import { http, HttpResponse } from 'msw';

export const TEST_API_URL = 'http://localhost/api/v1';

export const api = (path: string) => `${TEST_API_URL}${path}`;

export const ownerUser: MeDto = {
  id: '6f2f7c1e-6d3a-4f0e-9d7a-1b2c3d4e5f60',
  email: 'jan.nowak@example.com',
  firstName: 'Jan',
  lastName: 'Nowak',
  role: 'OWNER',
};

export const adminUser: MeDto = {
  id: '0b9f8e7d-6c5b-4a39-8271-605f4e3d2c1b',
  email: 'admin@example.com',
  firstName: 'Anna',
  lastName: 'Admin',
  role: 'ADMIN',
};

export function authResponse(user: MeDto = ownerUser, accessToken = 'access-1'): AuthResponseDto {
  return { accessToken, expiresIn: 900, user };
}

export function apiError(
  status: number,
  code: string,
  details?: Record<string, unknown>,
): HttpResponse<ErrorResponseDto> {
  const body: ErrorResponseDto = {
    statusCode: status,
    error: 'Error',
    code,
    message: code,
    details,
    path: '/api/v1',
    timestamp: '2026-10-09T10:00:00.000Z',
    requestId: 'req-test',
  };
  return HttpResponse.json(body, { status });
}

export const authHandlers = [
  http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')),
  http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })),
];
