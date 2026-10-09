import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../infrastructure/prisma/generated/client';
import { fromDbDate } from '../../../infrastructure/prisma/prisma-dates';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type {
  GuestData,
  GuestListItem,
  GuestSortField,
  GuestsFilter,
  GuestsRepository,
} from '../application/ports';

/** Kolumny sortowania z białej listy (wartości nigdy nie pochodzą wprost z żądania). */
const SORT_COLUMN: Record<GuestSortField, Prisma.Sql> = {
  lastName: Prisma.sql`g.last_name`,
  createdAt: Prisma.sql`g.created_at`,
  lastStayAt: Prisma.sql`last_stay_at`,
};

interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: Date;
  reservations_count: bigint;
  last_stay_at: Date | null;
}

/** `%` i `_` z wyszukiwania traktujemy dosłownie. */
const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class PrismaGuestsRepository extends PrismaRepository implements GuestsRepository {
  async list(filter: GuestsFilter): Promise<{ items: GuestListItem[]; total: number }> {
    const search = filter.q
      ? Prisma.sql`AND (g.first_name ILIKE ${likePattern(filter.q)} OR g.last_name ILIKE ${likePattern(filter.q)}
                        OR g.email ILIKE ${likePattern(filter.q)} OR g.phone ILIKE ${likePattern(filter.q)})`
      : Prisma.empty;
    const orderBy = Prisma.join(
      [
        ...filter.sort.map(
          ({ field, direction }) =>
            Prisma.sql`${SORT_COLUMN[field]} ${direction === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`} NULLS LAST`,
        ),
        // `id` jako ostatni klucz daje stabilną paginację przy równych wartościach.
        Prisma.sql`g.id ASC`,
      ],
      ', ',
    );

    // Liczniki i ostatni pobyt jednym zapytaniem z agregacją (bez N+1).
    const [rows, [count]] = await Promise.all([
      this.db.$queryRaw<GuestRow[]>`
        SELECT g.id, g.first_name, g.last_name, g.email, g.phone, g.created_at,
               COUNT(r.id) AS reservations_count,
               MAX(r.check_in) FILTER (WHERE r.status IN ('CONFIRMED', 'COMPLETED')) AS last_stay_at
        FROM guests g
        LEFT JOIN reservations r ON r.guest_id = g.id
        WHERE g.property_id = ${filter.propertyId}::uuid ${search}
        GROUP BY g.id
        ORDER BY ${orderBy}
        LIMIT ${filter.take} OFFSET ${filter.skip}
      `,
      this.db.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM guests g WHERE g.property_id = ${filter.propertyId}::uuid ${search}
      `,
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        reservationsCount: Number(row.reservations_count),
        lastStayAt: row.last_stay_at && fromDbDate(row.last_stay_at).toString(),
        createdAt: row.created_at,
      })),
      total: Number(count?.total ?? 0),
    };
  }

  async existsInProperty(id: string, propertyId: string): Promise<boolean> {
    return (await this.db.guest.count({ where: { id, propertyId } })) === 1;
  }

  async create(propertyId: string, data: GuestData & { email: null }): Promise<string> {
    const guest = await this.db.guest.create({
      data: { ...data, propertyId },
      select: { id: true },
    });
    return guest.id;
  }

  async upsertByEmail(propertyId: string, data: GuestData & { email: string }): Promise<string> {
    // `@default(uuid())` i `@updatedAt` działają po stronie Prismy, więc w surowym SQL podajemy je sami.
    const [row] = await this.db.$queryRaw<{ id: string }[]>`
      INSERT INTO guests (id, property_id, first_name, last_name, email, phone, created_at, updated_at)
      VALUES (${randomUUID()}::uuid, ${propertyId}::uuid, ${data.firstName}, ${data.lastName},
              ${data.email}, ${data.phone}, now(), now())
      ON CONFLICT (property_id, email) DO UPDATE
      -- Q-04: najnowsze imię i nazwisko; telefon tylko, gdy go podano (brak nie kasuje znanego numeru).
      SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
          phone = COALESCE(EXCLUDED.phone, guests.phone), updated_at = now()
      RETURNING id
    `;
    return row!.id;
  }
}
