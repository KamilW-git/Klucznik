import { Inject, Injectable } from '@nestjs/common';

import { type Clock, CLOCK } from '../../../common/domain/clock';
import { REFRESH_TOKENS_REPOSITORY, type RefreshTokensRepository } from './ports';

/** Eksportowany serwis modułu `auth`: unieważnianie sesji przy blokadzie konta (Q-10). */
@Injectable()
export class SessionsService {
  constructor(
    @Inject(REFRESH_TOKENS_REPOSITORY) private readonly refreshTokens: RefreshTokensRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  revokeAllForUser(userId: string): Promise<number> {
    return this.refreshTokens.revokeAllForUser(userId, this.clock.now());
  }
}
