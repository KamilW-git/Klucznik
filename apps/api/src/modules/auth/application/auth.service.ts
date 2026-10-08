import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { type Clock, CLOCK } from '../../../common/domain/clock';
import { PASSWORD_HASHER, type PasswordHasher } from '../../../common/security/password-hasher';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '../../../common/transactions/transaction-manager';
import { InvalidCredentialsError, SessionInvalidError } from './errors';
import {
  type AuthAccount,
  AUTH_ACCOUNTS_REPOSITORY,
  type AuthAccountsRepository,
  REFRESH_TOKENS_REPOSITORY,
  type RefreshTokensRepository,
} from './ports';
import { type IssuedAccessToken, type IssuedRefreshToken, TokenService } from './token.service';

export type Me = Omit<AuthAccount, 'passwordHash' | 'isActive'>;

export interface Session extends IssuedAccessToken {
  user: Me;
  refreshToken: IssuedRefreshToken;
}

/** Logowanie, rotacja refresh tokenu, wylogowanie i bieżący użytkownik (docs/features/auth.md). */
@Injectable()
export class AuthService {
  /** Hash losowego hasła porównywany przy nieznanym e-mailu, żeby czas odpowiedzi nie zdradzał istnienia konta. */
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(AUTH_ACCOUNTS_REPOSITORY) private readonly accounts: AuthAccountsRepository,
    @Inject(REFRESH_TOKENS_REPOSITORY) private readonly refreshTokens: RefreshTokensRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string): Promise<Session> {
    const account = await this.accounts.findByEmail(email.toLowerCase());
    const passwordOk = await this.hasher.verify(
      account?.passwordHash ?? (await (this.dummyHash ??= this.hasher.hash(randomUUID()))),
      password,
    );
    if (!account || !passwordOk || !account.isActive) {
      throw new InvalidCredentialsError();
    }
    return this.startSession(account);
  }

  /**
   * Rotacja: stary token jest unieważniany, a w jego miejsce powstaje nowy.
   * Ponowne użycie unieważnionego tokenu (prawdopodobna kradzież) unieważnia wszystkie sesje użytkownika.
   */
  async refresh(rawToken: string | undefined): Promise<Session> {
    if (!rawToken) {
      throw new SessionInvalidError();
    }
    const now = this.clock.now();
    const stored = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(rawToken));
    if (!stored || stored.expiresAt <= now) {
      throw new SessionInvalidError();
    }

    const outcome = await this.tx.run(async () => {
      const rotated =
        stored.revokedAt === null && (await this.refreshTokens.revoke(stored.id, now));
      if (!rotated) {
        await this.refreshTokens.revokeAllForUser(stored.userId, now);
        return null;
      }
      const account = await this.accounts.findById(stored.userId);
      if (!account?.isActive) {
        return null;
      }
      return this.startSession(account);
    });

    // Rzucamy po zakończeniu transakcji, żeby unieważnienie wszystkich sesji zostało zatwierdzone.
    if (!outcome) {
      throw new SessionInvalidError();
    }
    return outcome;
  }

  /** Idempotentne: brak lub nieznany token nie jest błędem. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const stored = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(rawToken));
    if (stored && stored.revokedAt === null) {
      await this.refreshTokens.revoke(stored.id, this.clock.now());
    }
  }

  async me(userId: string): Promise<Me> {
    const account = await this.accounts.findById(userId);
    if (!account?.isActive) {
      throw new SessionInvalidError();
    }
    return toMe(account);
  }

  private async startSession(account: AuthAccount): Promise<Session> {
    const refreshToken = this.tokens.issueRefreshToken();
    await this.refreshTokens.create({
      userId: account.id,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    });
    return {
      ...this.tokens.issueAccessToken({ id: account.id, role: account.role }),
      user: toMe(account),
      refreshToken,
    };
  }
}

function toMe({ id, email, firstName, lastName, role }: AuthAccount): Me {
  return { id, email, firstName, lastName, role };
}
