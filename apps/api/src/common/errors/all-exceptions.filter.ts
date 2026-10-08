import { STATUS_CODES } from 'node:http';

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { type Clock, CLOCK } from '../domain/clock';
import { DomainError } from '../domain/domain-error';
import { databaseErrorOf, isUnmappedConflict } from '../../infrastructure/prisma/prisma-errors';
import type { ErrorResponseDto } from '../http/error-response.dto';
import {
  codeForHttpStatus,
  DOMAIN_ERROR_HTTP_STATUS,
  type GenericErrorCode,
} from './error-http-map';
import { NotFoundError } from './not-found.error';
import { ValidationFailedException } from './validation';

interface MappedError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const DEFAULT_MESSAGES: Record<GenericErrorCode, string> = {
  VALIDATION_ERROR: 'Przesłane dane są niepoprawne.',
  UNAUTHORIZED: 'Wymagane jest zalogowanie.',
  FORBIDDEN: 'Brak uprawnień do tej operacji.',
  NOT_FOUND: 'Nie znaleziono zasobu.',
  CONFLICT: 'Operacja jest sprzeczna z aktualnym stanem zasobu.',
  FILE_TOO_LARGE: 'Plik jest za duży.',
  UNSUPPORTED_FILE_TYPE: 'Niedozwolony typ pliku.',
  RATE_LIMITED: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
  INTERNAL_ERROR: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.',
  SERVICE_UNAVAILABLE: 'Usługa jest chwilowo niedostępna.',
};

/**
 * Jedyne miejsce tłumaczenia błędów na HTTP (apps/api/docs/http-layer.md#mapowanie-błędów).
 * Każdy błąd ma format `ErrorResponseDto`. Stack trafia tylko do logu (z `requestId`).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${req.requestId}] ${req.method} ${req.originalUrl} failed`, stack);
    }

    if (res.headersSent) {
      return;
    }

    const body: ErrorResponseDto = {
      statusCode: mapped.status,
      error: STATUS_CODES[mapped.status] ?? 'Error',
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details && { details: mapped.details }),
      path: req.originalUrl,
      timestamp: this.clock.now().toISOString(),
      requestId: req.requestId,
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): MappedError {
    if (exception instanceof DomainError) {
      return {
        status: DOMAIN_ERROR_HTTP_STATUS[exception.code],
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, code: exception.code, message: exception.message };
    }

    if (exception instanceof ValidationFailedException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: exception.message,
        details: { fields: exception.fields },
      };
    }

    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    if (isUnmappedConflict(exception)) {
      // Sygnał, że repozytorium powinno przetłumaczyć ten constraint na błąd domenowy.
      this.logger.warn(`Unmapped database conflict: ${JSON.stringify(databaseErrorOf(exception))}`);
      return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: DEFAULT_MESSAGES.CONFLICT };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: DEFAULT_MESSAGES.INTERNAL_ERROR,
    };
  }

  /**
   * `HttpException` Nesta (guardy, throttler, body parser, `ParseUUIDPipe`). Kod według statusu.
   * Wyjątek rzucony z obiektem `{ code, message, details }` (np. `INVALID_CREDENTIALS` w M4)
   * zachowuje własny kod i komunikat. 503 z health checku (terminus) przekazuje wynik wskaźników
   * w `details`, żeby healthcheck Dockera i monitoring widziały, która usługa nie działa.
   */
  private mapHttpException(exception: HttpException): MappedError {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const fallbackCode = codeForHttpStatus(status);

    if (isCustomErrorBody(response)) {
      return {
        status,
        code: response.code,
        message: response.message ?? DEFAULT_MESSAGES[fallbackCode],
        details: response.details,
      };
    }

    if (fallbackCode === 'SERVICE_UNAVAILABLE' && isRecord(response)) {
      return {
        status,
        code: fallbackCode,
        message: DEFAULT_MESSAGES[fallbackCode],
        details: response,
      };
    }

    const original = typeof response === 'string' ? response : exception.message;
    this.logger.debug(`HttpException ${status}: ${original}`);
    return { status, code: fallbackCode, message: DEFAULT_MESSAGES[fallbackCode] };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCustomErrorBody(
  value: unknown,
): value is { code: string; message?: string; details?: Record<string, unknown> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    /^[A-Z][A-Z0-9_]*$/.test(value.code)
  );
}
