import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { isConstraintViolation, PG_ERROR } from '../../../infrastructure/prisma/prisma-errors';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import { SlugTakenError } from '../application/errors';
import type {
  AdminPropertiesFilter,
  AdminPropertyListItem,
  PropertiesRepository,
  Property,
  PropertyListItem,
  PropertySettings,
  PropertySummary,
} from '../application/ports';
import { SLUG_MAX_LENGTH } from '../domain/slug';

const PROPERTY_SELECT = {
  id: true,
  ownerId: true,
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
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PropertySelect;

const ACTIVE_ROOMS_COUNT = {
  _count: { select: { rooms: { where: { deletedAt: null } } } },
} as const;

@Injectable()
export class PrismaPropertiesRepository extends PrismaRepository implements PropertiesRepository {
  async findSlugsLike(base: string): Promise<Set<string>> {
    // Krótszy prefiks obejmuje też warianty, w których `firstFreeSlug` skrócił długi `base` pod sufiks.
    const rows = await this.db.property.findMany({
      where: { slug: { startsWith: base.slice(0, SLUG_MAX_LENGTH - 10) } },
      select: { slug: true },
    });
    return new Set(rows.map((row) => row.slug));
  }

  create(
    input: { ownerId: string; slug: string; name: string } & Partial<PropertySettings>,
  ): Promise<PropertySummary> {
    return this.mapSlugTaken(input.slug, () =>
      this.db.property.create({
        data: input,
        select: { id: true, name: true, slug: true, isActive: true },
      }),
    );
  }

  findById(id: string): Promise<Property | null> {
    return this.db.property.findFirst({ where: { id, deletedAt: null }, select: PROPERTY_SELECT });
  }

  async list(ownerId: string | undefined): Promise<PropertyListItem[]> {
    const rows = await this.db.property.findMany({
      where: { deletedAt: null, ownerId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        isActive: true,
        ...ACTIVE_ROOMS_COUNT,
      },
    });
    return rows.map(({ _count, ...row }) => ({ ...row, roomsCount: _count.rooms }));
  }

  async update(id: string, changes: Partial<PropertySettings> & { slug?: string }): Promise<void> {
    await this.mapSlugTaken(changes.slug, () =>
      this.db.property.update({ where: { id }, data: changes }),
    );
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.property.update({ where: { id }, data: { deletedAt: at } });
  }

  async lock(id: string): Promise<void> {
    await this.db.$queryRaw`SELECT id FROM properties WHERE id = ${id}::uuid FOR UPDATE`;
  }

  async ownerExists(ownerId: string): Promise<boolean> {
    return (await this.db.user.count({ where: { id: ownerId, role: 'OWNER' } })) === 1;
  }

  async listForAdmin(
    filter: AdminPropertiesFilter,
  ): Promise<{ items: AdminPropertyListItem[]; total: number }> {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ownerId: filter.ownerId,
      isActive: filter.isActive,
      ...(filter.q && {
        OR: [
          { name: { contains: filter.q, mode: 'insensitive' } },
          { city: { contains: filter.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.db.property.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: filter.skip,
        take: filter.take,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          isActive: true,
          createdAt: true,
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          ...ACTIVE_ROOMS_COUNT,
        },
      }),
      this.db.property.count({ where }),
    ]);

    return {
      items: rows.map(({ _count, ...row }) => ({ ...row, roomsCount: _count.rooms })),
      total,
    };
  }

  private async mapSlugTaken<T>(slug: string | undefined, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (slug && isConstraintViolation(error, PG_ERROR.UNIQUE_VIOLATION, 'properties_slug_key')) {
        throw new SlugTakenError(slug);
      }
      throw error;
    }
  }
}
