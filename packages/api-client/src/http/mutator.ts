import { ApiError } from './api-error';

/** Prefiks ścieżek w `openapi.json`; zastępowany przez `baseUrl`. */
const API_PATH_PREFIX = '/api/v1';
/** Endpointy sesji: ich 401 to wynik logowania lub odświeżenia, a nie wygasły access token. */
const SESSION_PATHS = new Set(
  ['login', 'refresh', 'logout'].map((name) => `${API_PATH_PREFIX}/auth/${name}`),
);

export interface ApiClientConfig {
  /** Adres API z prefiksem wersji, np. `/api/v1` (ten sam origin) albo `https://api.example.com/api/v1`. */
  baseUrl: string;
  getAccessToken: () => string | null;
  /** Odświeża sesję (cookie `kl_refresh`) i zwraca nowy access token albo `null`. */
  refresh: () => Promise<string | null>;
  /** Wywoływane, gdy sesji nie da się odświeżyć. */
  onUnauthorized: () => void;
}

const defaults: ApiClientConfig = {
  baseUrl: API_PATH_PREFIX,
  getAccessToken: () => null,
  refresh: () => Promise.resolve(null),
  onUnauthorized: () => undefined,
};

let config: ApiClientConfig = defaults;
let pendingRefresh: Promise<string | null> | null = null;

export function configureApiClient(options: Partial<ApiClientConfig>): void {
  config = { ...defaults, ...options };
  pendingRefresh = null;
}

/**
 * Single-flight: równoległe 401 czekają na jedno wspólne odświeżenie.
 * Używane też przez aplikację przy starcie (bootstrap sesji).
 */
export function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= config
    .refresh()
    .catch(() => null)
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

/** Mutator orval: `fetch` z ciasteczkami, nagłówkiem `Authorization` i błędami jako `ApiError`. */
export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await send(url, options, config.getAccessToken());

  if (response.status === 401 && !SESSION_PATHS.has(url.split('?')[0] ?? url)) {
    const token = await refreshAccessToken();
    if (token) {
      // Ponowienie tylko raz: drugie 401 oznacza utratę sesji.
      const retried = await send(url, options, token);
      if (retried.status !== 401) return parse<T>(retried);
    }
    config.onUnauthorized();
    return parse<T>(response);
  }

  return parse<T>(response);
}

async function send(url: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(resolveUrl(url), { ...options, headers, credentials: 'include' });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw ApiError.network(error);
  }
}

function resolveUrl(url: string): string {
  return url.startsWith(API_PATH_PREFIX)
    ? `${config.baseUrl.replace(/\/$/, '')}${url.slice(API_PATH_PREFIX.length)}`
    : url;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await readBody(response);
  if (!response.ok) throw ApiError.fromResponse(response.status, body);
  return body as T;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Typ błędu w wygenerowanych hookach (orval): mutator zawsze rzuca `ApiError`. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- sygnatura wymagana przez orval
export type ErrorType<_Error> = ApiError;
