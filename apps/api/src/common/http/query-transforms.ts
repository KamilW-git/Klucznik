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

/** Przycina tekst wyszukiwania (`?q=`). */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
