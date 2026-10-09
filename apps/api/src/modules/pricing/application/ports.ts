import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { PricingRate } from '../domain/seasonal-rate';

/** Stawka sezonowa pokoju (docs/architecture/data-model.md#seasonalrate-stawka-sezonowa). */
export interface SeasonalRate extends PricingRate {
  roomId: string;
}

export interface SeasonalRateData {
  name: string;
  dateFrom: CalendarDate;
  /** Ostatnia noc objęta stawką (włącznie). */
  dateTo: CalendarDate;
  pricePerNight: number;
  minNights: number | null;
}

export interface RatesRepository {
  /** Stawki pokoju przecinające `nights` (bez `nights`: wszystkie); sort `dateFrom:asc`. */
  listByRoom(
    roomId: string,
    nights?: { from?: CalendarDate; to?: CalendarDate },
  ): Promise<SeasonalRate[]>;
  findById(id: string): Promise<SeasonalRate | null>;
  /** Naruszenie `seasonal_rates_no_overlap` (wyścig) → `SeasonalRateOverlapError` (BR-09). */
  create(roomId: string, data: SeasonalRateData): Promise<SeasonalRate>;
  update(id: string, changes: Partial<SeasonalRateData>): Promise<SeasonalRate>;
  delete(id: string): Promise<void>;
}

export const RATES_REPOSITORY = Symbol('RATES_REPOSITORY');
