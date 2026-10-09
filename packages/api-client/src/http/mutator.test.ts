import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { configureApiClient, customFetch } from './mutator';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unauthorized = () =>
  json(401, { code: 'UNAUTHORIZED', message: 'Unauthorized', requestId: 'req-1' });

describe('customFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let token: string | null;

  beforeEach(() => {
    token = 'old';
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function authHeader(call: number): string | null {
    const init = fetchMock.mock.calls[call]?.[1];
    return new Headers(init?.headers).get('Authorization');
  }

  it('replaces the /api/v1 prefix with baseUrl, sends cookies and the bearer token', async () => {
    configureApiClient({ baseUrl: 'https://api.example.com/api/v1/', getAccessToken: () => token });
    fetchMock.mockResolvedValue(json(200, { ok: true }));

    await expect(customFetch('/api/v1/auth/me')).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/api/v1/auth/me');
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(authHeader(0)).toBe('Bearer old');
  });

  it('returns undefined for 204', async () => {
    configureApiClient({});
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(customFetch('/api/v1/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('throws ApiError with code, details and requestId', async () => {
    configureApiClient({});
    fetchMock.mockResolvedValue(
      json(409, {
        code: 'RESERVATION_OVERLAP',
        message: 'Overlap',
        details: { conflictingReservationNumber: 'KL-2026-000118' },
        requestId: 'req-9',
      }),
    );

    const error = await customFetch('/api/v1/reservations').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'RESERVATION_OVERLAP',
      details: { conflictingReservationNumber: 'KL-2026-000118' },
      requestId: 'req-9',
    });
  });

  it('maps a network failure to NETWORK_ERROR', async () => {
    configureApiClient({});
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(customFetch('/api/v1/auth/me')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('parallel 401s share one refresh and each request is retried with the new token', async () => {
    const refresh = vi.fn(async () => {
      await Promise.resolve();
      token = 'new';
      return token;
    });
    configureApiClient({ getAccessToken: () => token, refresh });
    fetchMock.mockImplementation((_url, init) =>
      Promise.resolve(
        new Headers(init?.headers).get('Authorization') === 'Bearer new'
          ? json(200, { ok: true })
          : unauthorized(),
      ),
    );

    const results = await Promise.all([
      customFetch('/api/v1/properties'),
      customFetch('/api/v1/reservations'),
      customFetch('/api/v1/rooms'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('a failed refresh calls onUnauthorized and throws the original 401', async () => {
    const onUnauthorized = vi.fn();
    configureApiClient({ refresh: () => Promise.resolve(null), onUnauthorized });
    fetchMock.mockImplementation(() => Promise.resolve(unauthorized()));

    await expect(customFetch('/api/v1/properties')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a second 401 after a successful refresh logs out (one retry only)', async () => {
    const onUnauthorized = vi.fn();
    configureApiClient({ refresh: () => Promise.resolve('new'), onUnauthorized });
    fetchMock.mockImplementation(() => Promise.resolve(unauthorized()));

    await expect(customFetch('/api/v1/properties')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401 from GET /auth/me (expired token) is refreshed like any other request', async () => {
    const refresh = vi.fn(() => Promise.resolve('new'));
    configureApiClient({ getAccessToken: () => token, refresh });
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json(200, { id: 'u-1' }));

    await expect(customFetch('/api/v1/auth/me')).resolves.toEqual({ id: 'u-1' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(authHeader(1)).toBe('Bearer new');
  });

  it('401 from the session endpoints (e.g. wrong password) does not trigger a refresh', async () => {
    const refresh = vi.fn(() => Promise.resolve('new'));
    configureApiClient({ refresh });
    fetchMock.mockResolvedValue(json(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid' }));

    await expect(
      customFetch('/api/v1/auth/login', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('ApiError', () => {
  it('fieldIssues reads VALIDATION_ERROR details.fields', () => {
    const error = ApiError.fromResponse(400, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { fields: [{ field: 'email', messages: ['email must be an email'] }, 'junk'] },
    });

    expect(error.fieldIssues).toEqual([{ field: 'email', messages: ['email must be an email'] }]);
  });

  it('a body outside the API format gives UNKNOWN_ERROR', () => {
    expect(ApiError.fromResponse(502, '<html>Bad gateway</html>')).toMatchObject({
      status: 502,
      code: 'UNKNOWN_ERROR',
    });
  });
});
