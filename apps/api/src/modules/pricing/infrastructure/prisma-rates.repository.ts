import { Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { PG_ERROR, isConstraintViolation } from '../../../infrastructure/prisma/prisma-errors';
import { fromDbDate, toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { RatesRepository, SeasonalRate, SeasonalRateData } from '../application/ports';
import { SeasonalRateOverlapError } from '../domain/errors';

const RATE_SELECT = {
  id: true,
  roomId: true,
  name: true,
  dateFrom: true,
  dateTo: true,
  pricePerNight: true,
  minNights: true,
} as const satisfies Prisma.SeasonalRateSelect;

type RateRow = Prisma.SeasonalRateGetPayload<{ select: typeof RATE_SELECT }>;

function toRate({ dateFrom, dateTo, ...row }: RateRow): SeasonalRate {
  return { ...row, nights: InclusiveDateRange.of(fromDbDate(dateFrom), fromDbDate(dateTo)) };
}

function toRow(data: Partial<SeasonalRateData>): Prisma.SeasonalRateUncheckedUpdateInput {
  const { dateFrom, dateTo, ...rest } = data;
  return {
    ...rest,
    ...(dateFrom && { dateFrom: toDbDate(dateFrom) }),
    ...(dateTo && { dateTo: toDbDate(dateTo) }),
  };
}

@Injectable()
export class PrismaRatesRepository extends PrismaRepository implements RatesRepository {
  async listByRoom(
    roomId: string,
    nights: { from?: CalendarDate; to?: CalendarDate } = {},
  ): Promise<SeasonalRate[]> {
    // Zakres włączny przecina [from, to], gdy dateFrom ≤ to i dateTo ≥ from.
    const rows = await this.db.seasonalRate.findMany({
      where: {
        roomId,
        ...(nights.to && { dateFrom: { lte: toDbDate(nights.to) } }),
        ...(nights.from && { dateTo: { gte: toDbDate(nights.from) } }),
      },
      orderBy: [{ dateFrom: 'asc' }, { id: 'asc' }],
      select: RATE_SELECT,
    });
    return rows.map(toRate);
  }

  async listForRooms(
    roomIds: readonly string[],
    nights: { from: CalendarDate; to: CalendarDate },
  ): Promise<SeasonalRate[]> {
    const rows = await this.db.seasonalRate.findMany({
      where: {
        roomId: { in: [...roomIds] },
        dateFrom: { lte: toDbDate(nights.to) },
        dateTo: { gte: toDbDate(nights.from) },
      },
      orderBy: [{ dateFrom: 'asc' }, { id: 'asc' }],
      select: RATE_SELECT,
    });
    return rows.map(toRate);
  }

  async findById(id: string): Promise<SeasonalRate | null> {
    const row = await this.db.seasonalRate.findUnique({ where: { id }, select: RATE_SELECT });
    return row && toRate(row);
  }

  create(roomId: string, data: SeasonalRateData): Promise<SeasonalRate> {
    return this.translateOverlap(async () =>
      toRate(
        await this.db.seasonalRate.create({
          data: {
            ...data,
            roomId,
            dateFrom: toDbDate(data.dateFrom),
            dateTo: toDbDate(data.dateTo),
          },
          select: RATE_SELECT,
        }),
      ),
    );
  }

  update(id: string, changes: Partial<SeasonalRateData>): Promise<SeasonalRate> {
    return this.translateOverlap(async () =>
      toRate(
        await this.db.seasonalRate.update({
          where: { id },
          data: toRow(changes),
          select: RATE_SELECT,
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.seasonalRate.delete({ where: { id } });
  }

  /** BR-09: constraint `EXCLUDE` łapie wyścig dwóch zapisów, które przeszły sprawdzenie w serwisie. */
  private async translateOverlap<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isConstraintViolation(error, PG_ERROR.EXCLUSION_VIOLATION, 'seasonal_rates_no_overlap')) {
        throw new SeasonalRateOverlapError();
      }
      throw error;
    }
  }
}
