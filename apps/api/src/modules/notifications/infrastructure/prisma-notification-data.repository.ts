import { Injectable } from '@nestjs/common';

import { fromDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type { NotificationDataRepository, ReservationNotificationData } from '../application/ports';

/** Odczyt rezerwacji z gościem, pokojem, obiektem i e-mailem właściciela jednym zapytaniem. */
@Injectable()
export class PrismaNotificationDataRepository
  extends PrismaRepository
  implements NotificationDataRepository
{
  async find(reservationId: string): Promise<ReservationNotificationData | null> {
    const row = await this.db.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        number: true,
        status: true,
        checkIn: true,
        checkOut: true,
        guestsCount: true,
        totalPrice: true,
        currency: true,
        guestNotes: true,
        expiresAt: true,
        cancelledBy: true,
        cancellationReason: true,
        room: { select: { name: true } },
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        property: {
          select: {
            name: true,
            slug: true,
            phone: true,
            contactEmail: true,
            street: true,
            postalCode: true,
            city: true,
            checkInTime: true,
            checkOutTime: true,
            cancellationDeadlineDays: true,
            owner: { select: { email: true } },
          },
        },
      },
    });
    if (!row) {
      return null;
    }
    const { owner, ...property } = row.property;
    return {
      ...row,
      checkIn: fromDbDate(row.checkIn).toString(),
      checkOut: fromDbDate(row.checkOut).toString(),
      property,
      ownerEmail: owner.email,
    };
  }
}
