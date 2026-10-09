import { Transform } from 'class-transformer';

/**
 * Parametr query `true`/`false` → boolean. Inne wartości zostają bez zmian, więc `@IsBoolean()` zwróci 400.
 * Potrzebne, bo `ValidationPipe` działa z `enableImplicitConversion: false`.
 */
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

/** Parametr query z liczbą całkowitą → number. Inne wartości zostają bez zmian (`@IsInt()` zwróci 400). */
export const ToInt = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value,
  );

/** Przycina tekst wyszukiwania (`?q=`). */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
