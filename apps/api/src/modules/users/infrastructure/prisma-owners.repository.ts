import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { isConstraintViolation, PG_ERROR } from '../../../infrastructure/prisma/prisma-errors';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import { EmailTakenError } from '../application/errors';
import type {
  NewOwner,
  OwnerChanges,
  OwnerDetail,
  OwnerListItem,
  OwnersFilter,
  OwnersRepository,
} from '../application/ports';

const OWNER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  isActive: true,
  createdAt: true,
  _count: { select: { properties: { where: { deletedAt: null } } } },
} as const satisfies Prisma.UserSelect;

type OwnerRow = Prisma.UserGetPayload<{ select: typeof OWNER_SELECT }>;

@Injectable()
export class PrismaOwnersRepository extends PrismaRepository implements OwnersRepository {
  async list(filter: OwnersFilter): Promise<{ items: OwnerListItem[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      role: 'OWNER',
      isActive: filter.isActive,
      ...(filter.q && {
        OR: (['firstName', 'lastName', 'email'] as const).map((field) => ({
          [field]: { contains: filter.q, mode: 'insensitive' },
        })),
      }),
    };

    const [rows, total] = await Promise.all([
      this.db.user.findMany({
        where,
        // `id` jako ostatni klucz daje stabilną paginację przy równych wartościach.
        orderBy: [
          ...filter.sort.map(({ field, direction }) => ({ [field]: direction })),
          { id: 'asc' },
        ],
        skip: filter.skip,
        take: filter.take,
        select: OWNER_SELECT,
      }),
      this.db.user.count({ where }),
    ]);

    const recent = await this.reservationsSince(
      rows.map((row) => row.id),
      filter.since,
    );
    return { items: rows.map((row) => toListItem(row, recent)), total };
  }

  async findById(id: string, since: Date): Promise<OwnerDetail | null> {
    const row = await this.db.user.findFirst({
      where: { id, role: 'OWNER' },
      select: {
        ...OWNER_SELECT,
        properties: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
    if (!row) {
      return null;
    }
    const recent = await this.reservationsSince([row.id], since);
    return { ...toListItem(row, recent), properties: row.properties };
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.user.count({ where: { id, role: 'OWNER' } })) === 1;
  }

  async create(owner: NewOwner): Promise<string> {
    const created = await this.mapEmailTaken(() =>
      this.db.user.create({ data: { ...owner, role: 'OWNER' }, select: { id: true } }),
    );
    return created.id;
  }

  async update(id: string, changes: OwnerChanges): Promise<void> {
    await this.mapEmailTaken(() => this.db.user.update({ where: { id }, data: changes }));
  }

  /** Jedno zapytanie dla całej strony listy (bez N+1). */
  private async reservationsSince(ownerIds: string[], since: Date): Promise<Map<string, number>> {
    if (ownerIds.length === 0) {
      return new Map();
    }
    const rows = await this.db.$queryRaw<{ owner_id: string; count: bigint }[]>`
      SELECT p.owner_id, COUNT(*) AS count
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE p.owner_id = ANY(${ownerIds}::uuid[]) AND r.created_at >= ${since}
      GROUP BY p.owner_id
    `;
    return new Map(rows.map((row) => [row.owner_id, Number(row.count)]));
  }

  private async mapEmailTaken<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isConstraintViolation(error, PG_ERROR.UNIQUE_VIOLATION, 'users_email_key')) {
        throw new EmailTakenError();
      }
      throw error;
    }
  }
}

function toListItem(row: OwnerRow, recent: Map<string, number>): OwnerListItem {
  const { _count, ...owner } = row;
  return {
    ...owner,
    propertiesCount: _count.properties,
    reservationsLast30Days: recent.get(row.id) ?? 0,
  };
}
