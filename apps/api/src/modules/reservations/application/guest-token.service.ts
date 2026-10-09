import { Inject, Injectable } from '@nestjs/common';

import { generateGuestToken } from './guest-token';
import { RESERVATIONS_REPOSITORY, type ReservationsRepository } from './reservation-ports';

/**
 * Q-16: każdy e-mail z linkiem `/r/:token` dostaje nowy token, a w bazie zostaje tylko hash
 * najnowszego. Surowy token wraca do wywołującego (dane joba e-maila) i nigdzie nie jest zapisywany.
 */
@Injectable()
export class GuestTokenService {
  constructor(
    @Inject(RESERVATIONS_REPOSITORY) private readonly reservations: ReservationsRepository,
  ) {}

  async issue(reservationId: string): Promise<string> {
    const { token, hash } = generateGuestToken();
    await this.reservations.setGuestTokenHash(reservationId, hash);
    return token;
  }
}
