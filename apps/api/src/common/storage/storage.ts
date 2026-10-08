import type { Readable } from 'node:stream';

/**
 * Port przechowywania plików (apps/api/docs/integrations.md#storage).
 * Klucze są płaskie: `<uuid>.<ext>`; adapter odrzuca inne (ochrona przed path traversal).
 */
export interface Storage {
  put(key: string, content: Buffer, mimeType: string): Promise<void>;
  /** Rzuca `NotFoundError` (404), gdy pliku nie ma albo klucz ma zły format. */
  get(key: string): Promise<{ stream: Readable; size: number }>;
  /** Idempotentne: brak pliku nie jest błędem. */
  delete(key: string): Promise<void>;
}

export const STORAGE = Symbol('STORAGE');

export const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isValidStorageKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}
