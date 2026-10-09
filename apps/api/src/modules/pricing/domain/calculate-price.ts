import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { StayRange } from '../../../common/domain/stay-range';
import { type PricingRate, rateCovering } from './seasonal-rate';

export interface NightPrice {
  date: CalendarDate;
  /** Grosze. */
  price: number;
  /** `null`: cena bazowa pokoju. */
  rateId: string | null;
}

export interface PriceQuote {
  nights: number;
  /** Grosze, suma cen nocy bez zaokrągleń. */
  total: number;
  breakdown: NightPrice[];
}

/**
 * BR-05: cena pobytu noc po nocy `[checkIn, checkOut)`. Każda noc ma cenę stawki sezonowej,
 * która ją obejmuje (zakres włączny), albo cenę bazową pokoju. Liczy wyłącznie serwer.
 */
export function calculatePrice(
  stay: StayRange,
  basePricePerNight: number,
  rates: readonly PricingRate[],
): PriceQuote {
  const breakdown = stay.eachNight().map((date): NightPrice => {
    const rate = rateCovering(rates, date);
    return {
      date,
      price: rate?.pricePerNight ?? basePricePerNight,
      rateId: rate?.id ?? null,
    };
  });
  return {
    nights: breakdown.length,
    total: breakdown.reduce((sum, night) => sum + night.price, 0),
    breakdown,
  };
}
