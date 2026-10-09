import { Inject, Injectable } from '@nestjs/common';

import type { StayRange } from '../../../common/domain/stay-range';
import { calculatePrice, type PriceQuote } from '../domain/calculate-price';
import { resolveMinNights } from '../domain/min-nights';
import { RATES_REPOSITORY, type RatesRepository } from './ports';

export interface PricedRoom {
  id: string;
  /** Grosze. */
  basePricePerNight: number;
  minNights: number;
}

export interface StayPricing {
  /** BR-03: minimalny pobyt obowiązujący dla nocy przyjazdu. */
  minNights: number;
  /** BR-05 */
  price: PriceQuote;
}

/**
 * Publiczne API cennika dla `availability` i `reservations` (docs/features/pricing.md).
 * Dostęp do pokoju sprawdza wywołujący.
 */
@Injectable()
export class PricingFacade {
  constructor(@Inject(RATES_REPOSITORY) private readonly rates: RatesRepository) {}

  async quote(room: PricedRoom, stay: StayRange): Promise<StayPricing> {
    const nights = stay.toNightsRange();
    const rates = await this.rates.listByRoom(room.id, { from: nights.from, to: nights.to });
    return {
      minNights: resolveMinNights(room, rates, stay.checkIn),
      price: calculatePrice(stay, room.basePricePerNight, rates),
    };
  }
}
