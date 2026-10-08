import { Injectable } from '@nestjs/common';

import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type {
  AuthAccount,
  AuthAccountsRepository,
  RefreshTokensRepository,
  StoredRefreshToken,
} from '../application/ports';

const ACCOUNT_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

@Injectable()
export class PrismaAuthAccountsRepository
  extends PrismaRepository
  implements AuthAccountsRepository
{
  findByEmail(email: string): Promise<AuthAccount | null> {
    return this.db.user.findUnique({ where: { email }, select: ACCOUNT_SELECT });
  }

  findById(id: string): Promise<AuthAccount | null> {
    return this.db.user.findUnique({ where: { id }, select: ACCOUNT_SELECT });
  }
}

@Injectable()
export class PrismaRefreshTokensRepository
  extends PrismaRepository
  implements RefreshTokensRepository
{
  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.refreshToken.create({ data: input });
  }

  findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.db.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return count === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<number> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
    return count;
  }
}
