import { HttpStatus } from '@nestjs/common';

import type { DomainErrorCode } from '../domain/domain-error';
import type { ApplicationErrorCode } from './application-error';

/**
 * Status HTTP dla każdego kodu błędu domenowego (docs/architecture/business-rules.md#podsumowanie).
 * `Record<DomainErrorCode, …>` sprawia, że nowy kod bez wpisu tutaj nie kompiluje się.
 */
export const DOMAIN_ERROR_HTTP_STATUS: Record<DomainErrorCode, HttpStatus> = {
  RESERVATION_OVERLAP: HttpStatus.CONFLICT, // BR-01
  BLOCK_OVERLAPS_RESERVATION: HttpStatus.CONFLICT, // BR-01, Q-15
  CAPACITY_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY, // BR-02
  MIN_NIGHTS_NOT_MET: HttpStatus.UNPROCESSABLE_ENTITY, // BR-03
  INVALID_STAY_DATES: HttpStatus.UNPROCESSABLE_ENTITY, // BR-04
  INVALID_STATUS_TRANSITION: HttpStatus.CONFLICT, // BR-06, BR-07
  RESERVATION_NOT_EDITABLE: HttpStatus.CONFLICT, // Q-02
  CANCELLATION_DEADLINE_PASSED: HttpStatus.UNPROCESSABLE_ENTITY, // BR-08
  SEASONAL_RATE_OVERLAP: HttpStatus.CONFLICT, // BR-09
  HAS_FUTURE_RESERVATIONS: HttpStatus.CONFLICT, // BR-10
  VERSION_CONFLICT: HttpStatus.CONFLICT, // BR-11
  ROOM_NOT_BOOKABLE: HttpStatus.UNPROCESSABLE_ENTITY, // BR-13
  PHOTO_LIMIT_REACHED: HttpStatus.UNPROCESSABLE_ENTITY, // Q-14
};

/** Status HTTP dla każdego kodu błędu aplikacyjnego (`ApplicationError`). */
export const APPLICATION_ERROR_HTTP_STATUS: Record<ApplicationErrorCode, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND, // BR-12: także zasób innego właściciela
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  EMAIL_TAKEN: HttpStatus.CONFLICT,
  SLUG_TAKEN: HttpStatus.CONFLICT,
  UNSUPPORTED_FILE_TYPE: HttpStatus.UNSUPPORTED_MEDIA_TYPE, // Q-14
};

/** Ogólne kody (docs/architecture/api-conventions.md#metody-i-kody-odpowiedzi). */
export type GenericErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

/** Kod dla `HttpException` Nesta (i błędów Expressa) według statusu. */
const HTTP_STATUS_CODE: Partial<Record<number, GenericErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'FILE_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_FILE_TYPE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE', // Q-27: health check
};

export function codeForHttpStatus(status: number): GenericErrorCode {
  return HTTP_STATUS_CODE[status] ?? 'INTERNAL_ERROR';
}
