/** Kody spoza API: brak połączenia albo odpowiedź, która nie jest błędem w formacie API. */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export interface ApiErrorFieldIssue {
  field: string;
  messages: string[];
}

/**
 * Błąd żądania do API w formacie z `api-conventions.md` (`ErrorResponseDto`).
 * UI rozpoznaje błędy wyłącznie po `code`.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | null = null,
    readonly requestId: string | null = null,
  ) {
    super(message);
  }

  /** Buduje błąd z treści odpowiedzi; treść spoza formatu API daje `UNKNOWN_ERROR`. */
  static fromResponse(status: number, body: unknown): ApiError {
    if (isErrorBody(body)) {
      return new ApiError(
        status,
        body.code,
        body.message,
        isRecord(body.details) ? body.details : null,
        typeof body.requestId === 'string' ? body.requestId : null,
      );
    }
    return new ApiError(status, CLIENT_ERROR_CODES.UNKNOWN_ERROR, `HTTP ${status}`);
  }

  static network(cause: unknown): ApiError {
    const error = new ApiError(0, CLIENT_ERROR_CODES.NETWORK_ERROR, 'Network error');
    error.cause = cause;
    return error;
  }

  /** `VALIDATION_ERROR`: `details.fields` jako lista `{ field, messages }`. */
  get fieldIssues(): ApiErrorFieldIssue[] {
    const fields = this.details?.['fields'];
    if (!Array.isArray(fields)) return [];
    return fields.filter(
      (item): item is ApiErrorFieldIssue =>
        isRecord(item) && typeof item['field'] === 'string' && Array.isArray(item['messages']),
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorBody(
  body: unknown,
): body is { code: string; message: string; details?: unknown; requestId?: unknown } {
  return isRecord(body) && typeof body['code'] === 'string' && typeof body['message'] === 'string';
}
