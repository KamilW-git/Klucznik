import type { CalendarDate } from '../../../common/domain/calendar-date';
import type { StayRange } from '../../../common/domain/stay-range';
import { MinNightsNotMetError } from './errors';
import { type PricingRate, rateCovering } from './seasonal-rate';

// BR-03: minimalny pobyt ze stawki obejmującej noc przyjazdu (jeśli ją ustawia), inaczej z pokoju.
export function resolveMinNights(
  room: { minNights: number },
  rates: readonly PricingRate[],
  checkIn: CalendarDate,
): number {
  return rateCovering(rates, checkIn)?.minNights ?? room.minNights;
}

// BR-03
export function assertMinNights(stay: StayRange, minNights: number): void {
  if (stay.nights() < minNights) {
    throw new MinNightsNotMetError(minNights, stay.nights());
  }
}
