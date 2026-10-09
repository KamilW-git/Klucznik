const API_PATH_PREFIX = '/api/v1';

/**
 * Adres zdjęcia z `PhotoDto.url` (`/api/v1/files/<klucz>`) z uwzględnieniem `VITE_API_BASE_URL`,
 * gdy API działa pod innym originem niż SPA (jak `baseUrl` mutatora).
 */
export function fileUrl(url: string): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || !url.startsWith(API_PATH_PREFIX)) return url;
  return `${base.replace(/\/$/, '')}${url.slice(API_PATH_PREFIX.length)}`;
}
