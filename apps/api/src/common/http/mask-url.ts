// Token gościa w `/public/reservations/:token` to sekret (docs/architecture/security.md#token-gościa).
const GUEST_TOKEN_IN_PATH = /(\/public\/reservations\/)([^/?#]{1,6})[^/?#]*/;

/** URL do logów: z tokenu gościa zostaje tylko 6 pierwszych znaków. */
export function maskSecretsInUrl(url: string): string {
  return url.replace(GUEST_TOKEN_IN_PATH, '$1$2…');
}
