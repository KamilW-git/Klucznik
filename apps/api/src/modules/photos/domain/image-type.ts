export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export const IMAGE_EXTENSIONS: Record<ImageMimeType, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string): number[] => [...text].map((char) => char.charCodeAt(0));

/**
 * Typ obrazu po sygnaturze pliku (magic bytes), a nie po nazwie ani `Content-Type` od klienta
 * (docs/architecture/security.md#upload-plików). `null` = typ niedozwolony (Q-14).
 */
export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return 'image/png';
  }
  // RIFF <rozmiar: 4 bajty> WEBP
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) {
    return 'image/webp';
  }
  return null;
}
