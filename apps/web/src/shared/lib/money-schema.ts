import { z } from 'zod';

/** Limit API dla cen (`basePricePerNight`, `pricePerNight`): 100 000 zł w groszach. */
export const MAX_PRICE_MINOR = 10_000_000;

/**
 * Kwota w groszach z `MoneyInput`: `null` = puste pole, `NaN` = niepoprawny tekst.
 * Wynik walidacji to liczba (pole wymagane).
 */
export const minorPriceSchema = z
  .number()
  .nullable()
  .refine((value): value is number => value !== null, 'Podaj kwotę.')
  .refine((value) => !Number.isNaN(value), 'Podaj kwotę w złotych, np. 380 lub 380,50.')
  .refine((value) => value >= 0 && value <= MAX_PRICE_MINOR, 'Kwota od 0 do 100 000 zł.');
