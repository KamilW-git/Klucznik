/** Minimalne pliki z poprawną sygnaturą (treść obrazu nie ma znaczenia dla API). */
export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 2),
]);
/** Plik wykonywalny Windows (`MZ…`) udający JPG. */
export const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 3)]);
