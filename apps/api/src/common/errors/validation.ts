import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface FieldErrors {
  /** Ścieżka pola z kropkami, np. `guest.email`, `rooms.0.capacity`. */
  field: string;
  messages: string[];
}

/** 400 `VALIDATION_ERROR` z `details.fields` (docs/architecture/api-conventions.md#format-błędu). */
export class ValidationFailedException extends BadRequestException {
  constructor(readonly fields: FieldErrors[]) {
    super('Przesłane dane są niepoprawne.');
  }
}

/** Spłaszcza drzewo błędów class-validator do listy pól ze ścieżkami. */
export function flattenValidationErrors(errors: ValidationError[], parentPath = ''): FieldErrors[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: FieldErrors[] = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

/** Globalny pipe walidacji (docs: apps/api/docs/http-layer.md#globalna-konfiguracja-maints). */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => new ValidationFailedException(flattenValidationErrors(errors)),
  });
}
