import { isValid } from 'date-fns';

import type { StaySearchParams } from '@/app/routes';
import { parseApiDate, pluralize, toApiDate } from '@/shared/lib/dates';

/** Wyszukiwanie pobytu z adresu P2 i P3 (`?checkIn&checkOut&guests`). */
export type StaySearch = StaySearchParams;

export const MAX_GUESTS = 99;

const API_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isApiDate(value: string): boolean {
  return (
    API_DATE.test(value) && isValid(parseApiDate(value)) && toApiDate(parseApiDate(value)) === value
  );
}

/**
 * Parametry z URL albo `null`, gdy brakuje dat, są niepoprawne lub wyjazd nie jest po przyjeździe.
 * Reguły terminu (BR-04: przeszłość, limit nocy) sprawdza API (`422 INVALID_STAY_DATES`).
 */
export function parseStaySearch(params: URLSearchParams): StaySearch | null {
  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const guests = Number(params.get('guests') ?? '');
  if (!isApiDate(checkIn) || !isApiDate(checkOut) || checkOut <= checkIn) return null;
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) return null;
  return { checkIn, checkOut, guests };
}

/** „1 osoba”, „3 osoby”, „5 osób”. */
export function formatGuests(count: number): string {
  return `${count} ${pluralize(count, 'osoba', 'osoby', 'osób')}`;
}
