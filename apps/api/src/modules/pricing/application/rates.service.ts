import { Inject, Injectable } from '@nestjs/common';

import type { AccessScope } from '../../../common/access/access-scope';
import {
  type OwnedProperty,
  OWNERSHIP_POLICY,
  type OwnershipPolicy,
} from '../../../common/access/ownership.policy';
import type { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import { NotFoundError } from '../../../common/errors/not-found.error';
import { SeasonalRateOverlapError } from '../domain/errors';
import { findOverlappingRate } from '../domain/seasonal-rate';
import {
  RATES_REPOSITORY,
  type RatesRepository,
  type SeasonalRate,
  type SeasonalRateData,
} from './ports';

export interface RateView extends SeasonalRate {
  currency: string;
}

/**
 * Stawki sezonowe pokoju (docs/features/pricing.md). Dostęp przez pokój (BR-12).
 * Zmiana lub usunięcie stawki nie zmienia cen istniejących rezerwacji (BR-05).
 */
@Injectable()
export class RatesService {
  constructor(
    @Inject(RATES_REPOSITORY) private readonly rates: RatesRepository,
    @Inject(OWNERSHIP_POLICY) private readonly ownership: OwnershipPolicy,
  ) {}

  async list(
    roomId: string,
    scope: AccessScope,
    nights: { from?: CalendarDate; to?: CalendarDate },
  ): Promise<RateView[]> {
    const { property } = await this.ownership.assertRoom(roomId, scope);
    const rates = await this.rates.listByRoom(roomId, nights);
    return rates.map((rate) => withCurrency(rate, property));
  }

  async create(roomId: string, scope: AccessScope, data: SeasonalRateData): Promise<RateView> {
    const { property } = await this.ownership.assertRoom(roomId, scope);
    await this.assertNoOverlap(roomId, InclusiveDateRange.of(data.dateFrom, data.dateTo));
    return withCurrency(await this.rates.create(roomId, data), property);
  }

  async update(
    id: string,
    scope: AccessScope,
    changes: Partial<SeasonalRateData>,
  ): Promise<RateView> {
    const { rate, property } = await this.findOrFail(id, scope);
    const nights = InclusiveDateRange.of(
      changes.dateFrom ?? rate.nights.from,
      changes.dateTo ?? rate.nights.to,
    );
    await this.assertNoOverlap(rate.roomId, nights, id);
    return withCurrency(await this.rates.update(id, changes), property);
  }

  async delete(id: string, scope: AccessScope): Promise<void> {
    await this.findOrFail(id, scope);
    await this.rates.delete(id);
  }

  // BR-09: sprawdzenie przed zapisem daje UI kolidującą stawkę; wyścig łapie constraint w bazie.
  private async assertNoOverlap(
    roomId: string,
    nights: InclusiveDateRange,
    excludeId?: string,
  ): Promise<void> {
    const nearby = await this.rates.listByRoom(roomId, { from: nights.from, to: nights.to });
    const conflicting = findOverlappingRate(nights, nearby, excludeId);
    if (conflicting) {
      throw new SeasonalRateOverlapError(conflicting);
    }
  }

  /** Stawka cudzego lub usuniętego pokoju → 404 (BR-12). */
  private async findOrFail(
    id: string,
    scope: AccessScope,
  ): Promise<{ rate: SeasonalRate; property: OwnedProperty }> {
    const rate = await this.rates.findById(id);
    if (!rate) {
      throw new NotFoundError('SeasonalRate', id);
    }
    const { property } = await this.ownership.assertRoom(rate.roomId, scope);
    return { rate, property };
  }
}

function withCurrency(rate: SeasonalRate, property: OwnedProperty): RateView {
  return { ...rate, currency: property.currency };
}
