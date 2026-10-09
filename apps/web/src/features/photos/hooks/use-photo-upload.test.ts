import { describe, expect, it } from 'vitest';

import { MAX_FILE_BYTES, validateFile } from './use-photo-upload';

const file = (type: string, size: number) => new File([new Uint8Array(size)], 'zdjecie', { type });

describe('validateFile (Q-14: JPG, PNG, WebP ≤ 10 MB)', () => {
  it('accepts JPG, PNG and WebP up to 10 MB', () => {
    expect(validateFile(file('image/jpeg', 1000))).toBeNull();
    expect(validateFile(file('image/png', MAX_FILE_BYTES))).toBeNull();
    expect(validateFile(file('image/webp', 10))).toBeNull();
  });

  it('rejects other types and files over 10 MB with a Polish message', () => {
    expect(validateFile(file('image/gif', 10))).toContain('JPG, PNG lub WebP');
    expect(validateFile(file('image/jpeg', MAX_FILE_BYTES + 1))).toContain('za duży');
  });
});
