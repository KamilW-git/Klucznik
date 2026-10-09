import { ApiError } from '@klucznik/api-client';
import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, API_ERROR_MESSAGES, getErrorMessage, getRequestId } from './api-errors';

const error = (code: string, details: Record<string, unknown> | null = null, status = 409) =>
  new ApiError(status, code, `raw server message for ${code}`, details, 'req-1');

describe('api-errors', () => {
  it('every known code has a Polish message (also with empty details)', () => {
    for (const code of API_ERROR_CODES) {
      const message = getErrorMessage(error(code));
      expect(API_ERROR_MESSAGES[code], code).toBeDefined();
      expect(message, code).not.toContain('raw server message');
      expect(message.length, code).toBeGreaterThan(5);
    }
  });

  it('BR-03 MIN_NIGHTS_NOT_MET uses details.minNights with Polish plural', () => {
    expect(getErrorMessage(error('MIN_NIGHTS_NOT_MET', { minNights: 3 }))).toBe(
      'Minimalny pobyt w tym terminie: 3 noce.',
    );
    expect(getErrorMessage(error('MIN_NIGHTS_NOT_MET', { minNights: 5 }))).toBe(
      'Minimalny pobyt w tym terminie: 5 nocy.',
    );
  });

  it('BR-04 INVALID_STAY_DATES uses details.reason', () => {
    expect(getErrorMessage(error('INVALID_STAY_DATES', { reason: 'CHECK_IN_IN_PAST' }))).toBe(
      'Data przyjazdu nie może być w przeszłości.',
    );
  });

  it('BR-08, BR-09, BR-10 and the block overlap interpolate details', () => {
    expect(
      getErrorMessage(error('CANCELLATION_DEADLINE_PASSED', { cancellableUntil: '2026-08-07' })),
    ).toContain('07.08.2026');
    expect(
      getErrorMessage(error('SEASONAL_RATE_OVERLAP', { conflictingRateName: 'Lato 2026' })),
    ).toBe('Ta stawka nakłada się na stawkę „Lato 2026”.');
    expect(getErrorMessage(error('HAS_FUTURE_RESERVATIONS', { count: 2 }))).toBe(
      'Nie można usunąć – istnieją przyszłe rezerwacje (2).',
    );
    expect(
      getErrorMessage(
        error('BLOCK_OVERLAPS_RESERVATION', { conflictingReservationNumber: 'KL-2026-000118' }),
      ),
    ).toContain('KL-2026-000118');
  });

  it('unknown codes and non-API errors fall back to the generic message', () => {
    expect(getErrorMessage(error('SOMETHING_NEW'))).toBe('Coś poszło nie tak. Spróbuj ponownie.');
    expect(getErrorMessage(new Error('boom'))).toBe('Coś poszło nie tak. Spróbuj ponownie.');
  });

  it('exposes requestId only for 5xx', () => {
    expect(getRequestId(error('INTERNAL_ERROR', null, 500))).toBe('req-1');
    expect(getRequestId(error('NOT_FOUND', null, 404))).toBeNull();
  });
});
