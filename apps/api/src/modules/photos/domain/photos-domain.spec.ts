import { detectImageType } from './image-type';
import { moveToPosition } from './photo-order';

const bytes = (...values: (number | string)[]): Uint8Array =>
  Uint8Array.from(
    values.flatMap((value) =>
      typeof value === 'string' ? [...value].map((char) => char.charCodeAt(0)) : [value],
    ),
  );

describe('detectImageType', () => {
  it('recognizes JPEG, PNG and WebP by their signatures', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe('image/jpeg');
    expect(detectImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe('image/png');
    expect(detectImageType(bytes('RIFF', 0x24, 0x00, 0x00, 0x00, 'WEBPVP8 '))).toBe('image/webp');
  });

  it.each([
    ['Windows executable renamed to .jpg', bytes('MZ', 0x90, 0x00)],
    ['GIF', bytes('GIF89a')],
    ['PDF', bytes('%PDF-1.7')],
    ['RIFF that is not WebP (WAV)', bytes('RIFF', 0x24, 0x00, 0x00, 0x00, 'WAVE')],
    ['truncated JPEG header', bytes(0xff, 0xd8)],
    ['empty file', bytes()],
  ])('rejects %s', (_, content) => {
    expect(detectImageType(content)).toBeNull();
  });
});

describe('moveToPosition', () => {
  const gallery = ['a', 'b', 'c', 'd'];

  it('moves a photo up to become the cover (position 0)', () => {
    expect(moveToPosition(gallery, 'c', 0)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves a photo down', () => {
    expect(moveToPosition(gallery, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('keeps the order when the position does not change', () => {
    expect(moveToPosition(gallery, 'b', 1)).toEqual(gallery);
  });

  it('clamps positions outside the gallery to the last place', () => {
    expect(moveToPosition(gallery, 'a', 99)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('throws for a photo outside the gallery', () => {
    expect(() => moveToPosition(gallery, 'x', 0)).toThrow(RangeError);
  });
});
