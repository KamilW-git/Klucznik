import type { Role } from '../../../common/auth/auth-user';

/** Konto z perspektywy uwierzytelniania (tylko pola potrzebne do logowania i `/auth/me`). */
export interface AuthAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
}

/** Odczyt kont dla `auth`. Moduł `users` zarządza kontami, `auth` je tylko czyta. */
export interface AuthAccountsRepository {
  findByEmail(email: string): Promise<AuthAccount | null>;
  findById(id: string): Promise<AuthAccount | null>;
}

export const AUTH_ACCOUNTS_REPOSITORY = Symbol('AUTH_ACCOUNTS_REPOSITORY');

export interface StoredRefreshToken {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface RefreshTokensRepository {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  /** Zapis warunkowy (`revokedAt IS NULL`): `false`, gdy token był już unieważniony (wyścig, ponowne użycie). */
  revoke(id: string, at: Date): Promise<boolean>;
  revokeAllForUser(userId: string, at: Date): Promise<number>;
}

export const REFRESH_TOKENS_REPOSITORY = Symbol('REFRESH_TOKENS_REPOSITORY');
