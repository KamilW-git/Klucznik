import { isApiError } from '@klucznik/api-client';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** Komunikaty `details.fields[].messages` są techniczne (class-validator, po angielsku). */
const FIELD_ERROR_MESSAGE = 'Nieprawidłowa wartość. Popraw to pole.';

/**
 * `VALIDATION_ERROR`: oznacza pola z `details.fields` w formularzu (RHF `setError`).
 * Zwraca `true`, gdy wszystkie pola błędu dało się przypisać; inaczej formularz pokazuje ogólny alert.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') return false;
  const issues = error.fieldIssues;
  if (issues.length === 0) return false;
  let allMapped = true;
  for (const issue of issues) {
    const field = fields.find((name) => name === issue.field);
    if (field) {
      setError(field, { type: 'server', message: FIELD_ERROR_MESSAGE });
    } else {
      allMapped = false;
    }
  }
  return allMapped;
}
