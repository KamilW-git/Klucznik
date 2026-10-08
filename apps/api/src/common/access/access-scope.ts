import type { AuthUser, Role } from '../auth/auth-user';

/**
 * Zakres dostępu do danych panelu (BR-12, ADR 0008). Repozytoria budują z niego warunek zapytania:
 * `OWNER` widzi tylko zasoby swoich obiektów, `ADMIN` wszystkie.
 */
export interface AccessScope {
  userId: string;
  role: Role;
}

export const scopeOf = (user: AuthUser): AccessScope => ({ userId: user.id, role: user.role });

/** Właściciel, do którego trzeba zawęzić zapytanie, albo `undefined` dla `ADMIN` (bez filtra). */
export function ownerIdFilter(scope: AccessScope): string | undefined {
  return scope.role === 'ADMIN' ? undefined : scope.userId;
}
