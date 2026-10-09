import { Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { toDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { PublicPropertiesRepository, PublicProperty, PublicRoom } from '../application/ports';

@Injectable()
export class PrismaPublicPropertiesRepository
  extends PrismaRepository
  implements PublicPropertiesRepository
{
  findBySlug(slug: string): Promise<PublicProperty | null> {
    // Jawna lista pól: bez `ownerId` i danych wewnętrznych.
    return this.db.property.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        street: true,
        postalCode: true,
        city: true,
        phone: true,
        contactEmail: true,
        checkInTime: true,
        checkOutTime: true,
        cancellationDeadlineDays: true,
        pendingExpiryHours: true,
        currency: true,
      },
    });
  }

  async listRooms(propertyId: string, today: CalendarDate): Promise<PublicRoom[]> {
    const rooms = await this.db.room.findMany({
      where: { propertyId, isActive: true, deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        minNights: true,
        basePricePerNight: true,
        // Najtańsza stawka, która jeszcze obowiązuje (`dateTo ≥ dziś`).
        seasonalRates: {
          where: { dateTo: { gte: toDbDate(today) } },
          orderBy: { pricePerNight: 'asc' },
          take: 1,
          select: { pricePerNight: true },
        },
      },
    });
    return rooms.map(({ basePricePerNight, seasonalRates, ...room }) => ({
      ...room,
      priceFrom: Math.min(basePricePerNight, seasonalRates[0]?.pricePerNight ?? basePricePerNight),
    }));
  }
}
