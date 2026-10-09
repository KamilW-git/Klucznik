import type { CalendarDate } from '../../../common/domain/calendar-date';
import { type InclusiveDateRange, inclusiveRangesOverlap } from '../../../common/domain/date-range';

/** Stawka sezonowa w postaci potrzebnej regułom: zakres nocy **włącznie** (ADR 0007). */
export interface PricingRate {
  id: string;
  name: string;
  nights: InclusiveDateRange;
  /** Grosze. */
  pricePerNight: number;
  /** `null`: obowiązuje `Room.minNights` (BR-03). */
  minNights: number | null;
}

/** Stawka obejmująca daną noc. Dzięki BR-09 jest co najwyżej jedna. */
export function rateCovering(
  rates: readonly PricingRate[],
  night: CalendarDate,
): PricingRate | undefined {
  return rates.find((rate) => rate.nights.contains(night));
}

// BR-09: stawki pokoju nie nakładają się (zakresy nocy włącznie). `excludeId` pomija edytowaną stawkę.
export function findOverlappingRate(
  nights: InclusiveDateRange,
  rates: readonly PricingRate[],
  excludeId?: string,
): PricingRate | undefined {
  return rates.find((rate) => rate.id !== excludeId && inclusiveRangesOverlap(rate.nights, nights));
}
