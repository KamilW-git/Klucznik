export const ROLES = ['ADMIN', 'OWNER'] as const;
export type Role = (typeof ROLES)[number];

/** Zalogowany użytkownik z access tokenu (`sub`, `role`). Ustawiany przez `JwtAuthGuard` w `req.user`. */
export interface AuthUser {
  id: string;
  role: Role;
}

/** Weryfikacja access tokenu dla `JwtAuthGuard`. Implementacja: `TokenService` w module `auth`. */
export interface AccessTokenVerifier {
  /** Zwraca użytkownika albo `null`, gdy token jest nieważny, wygasły lub podrobiony. */
  verify(token: string): AuthUser | null;
}

export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- rozszerzenie typów Expressa
  namespace Express {
    interface Request {
      /** Ustawiane przez `JwtAuthGuard` dla tras chronionych. */
      user?: AuthUser;
    }
  }
}
