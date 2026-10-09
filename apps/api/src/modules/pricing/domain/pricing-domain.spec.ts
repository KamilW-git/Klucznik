import { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import { StayRange } from '../../../common/domain/stay-range';
import { calculatePrice } from './calculate-price';
import { MinNightsNotMetError } from './errors';
import { assertMinNights, resolveMinNights } from './min-nights';
import { findOverlappingRate, type PricingRate } from './seasonal-rate';

const d = (value: string): CalendarDate => CalendarDate.parse(value);
const stay = (checkIn: string, checkOut: string): StayRange =>
  StayRange.of(d(checkIn), d(checkOut));
const rate = (
  id: string,
  from: string,
  to: string,
  pricePerNight: number,
  minNights: number | null = null,
): PricingRate => ({
  id,
  name: `Stawka ${id}`,
  nights: InclusiveDateRange.of(d(from), d(to)),
  pricePerNight,
  minNights,
});

const highSeason = rate('high', '2026-07-01', '2026-08-31', 45_000, 3);

describe('calculatePrice', () => {
  it('BR-05: base price only: 4 nights × 380 zł = 152 000 gr', () => {
    const quote = calculatePrice(stay('2026-06-10', '2026-06-14'), 38_000, [highSeason]);

    expect(quote.nights).toBe(4);
    expect(quote.total).toBe(152_000);
    expect(quote.breakdown.every((night) => night.rateId === null)).toBe(true);
  });

  it('BR-05: stay across the season start (2 × base + 2 × season), example from the catalog', () => {
    const fromMid = rate('mid', '2026-08-16', '2026-08-31', 45_000);

    const quote = calculatePrice(stay('2026-08-14', '2026-08-18'), 37_000, [fromMid]);

    expect(quote.total).toBe(164_000);
    expect(
      quote.breakdown.map((night) => [night.date.toString(), night.price, night.rateId]),
    ).toEqual([
      ['2026-08-14', 37_000, null],
      ['2026-08-15', 37_000, null],
      ['2026-08-16', 45_000, 'mid'],
      ['2026-08-17', 45_000, 'mid'],
    ]);
  });

  it('BR-05: the dateTo night of a rate is covered (inclusive range); check-out day is not charged', () => {
    const quote = calculatePrice(stay('2026-08-30', '2026-09-02'), 37_000, [highSeason]);

    expect(quote.breakdown.map((night) => night.price)).toEqual([45_000, 45_000, 37_000]);
  });

  it('BR-05: a free night (price 0) is a valid seasonal price, not a fallback to base', () => {
    const promo = rate('promo', '2026-10-01', '2026-10-01', 0);

    expect(calculatePrice(stay('2026-10-01', '2026-10-02'), 37_000, [promo]).total).toBe(0);
  });
});

describe('resolveMinNights / assertMinNights', () => {
  const room = { minNights: 1 };

  it('BR-03: takes minNights of the rate covering the check-in night', () => {
    expect(resolveMinNights(room, [highSeason], d('2026-08-14'))).toBe(3);
  });

  it('BR-03: check-in night outside the season → room minNights (even if the stay enters the season)', () => {
    expect(resolveMinNights(room, [highSeason], d('2026-06-30'))).toBe(1);
  });

  it('BR-03: a season without minNights falls back to the room', () => {
    const noMin = rate('no-min', '2026-07-01', '2026-08-31', 45_000, null);

    expect(resolveMinNights({ minNights: 2 }, [noMin], d('2026-08-14'))).toBe(2);
  });

  it('BR-03: a 2-night stay in a 3-night season → MIN_NIGHTS_NOT_MET with details.minNights', () => {
    let error: unknown;
    try {
      assertMinNights(stay('2026-08-14', '2026-08-16'), 3);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(MinNightsNotMetError);
    expect(error).toMatchObject({ code: 'MIN_NIGHTS_NOT_MET', details: { minNights: 3 } });
  });

  it('BR-03: exactly minNights is enough', () => {
    expect(() => assertMinNights(stay('2026-08-14', '2026-08-17'), 3)).not.toThrow();
  });
});

describe('findOverlappingRate', () => {
  const nights = (from: string, to: string): InclusiveDateRange =>
    InclusiveDateRange.of(d(from), d(to));

  it('BR-09: "Sierpień" inside "Wysoki sezon" overlaps', () => {
    expect(findOverlappingRate(nights('2026-08-01', '2026-08-15'), [highSeason])).toBe(highSeason);
  });

  it('BR-09: adjacent ranges (31.08 / 01.09) do not overlap', () => {
    expect(findOverlappingRate(nights('2026-09-01', '2026-09-30'), [highSeason])).toBeUndefined();
    expect(findOverlappingRate(nights('2026-06-01', '2026-06-30'), [highSeason])).toBeUndefined();
  });

  it('BR-09: a shared single night overlaps', () => {
    expect(findOverlappingRate(nights('2026-08-31', '2026-09-10'), [highSeason])).toBe(highSeason);
  });

  it('BR-09: the edited rate does not collide with itself', () => {
    expect(
      findOverlappingRate(nights('2026-07-01', '2026-09-10'), [highSeason], 'high'),
    ).toBeUndefined();
  });
});
