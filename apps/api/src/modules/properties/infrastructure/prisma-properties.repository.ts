import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { isConstraintViolation, PG_ERROR } from '../../../infrastructure/prisma/prisma-errors';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import { SlugTakenError } from '../application/errors';
import { SLUG_MAX_LENGTH } from '../domain/slug';
import type {
  AdminPropertiesFilter,
  AdminPropertyListItem,
  PropertiesRepository,
  PropertySummary,
} from '../application/ports';

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

  async create(input: { ownerId: string; name: string; slug: string }): Promise<PropertySummary> {
    try {
      return await this.db.property.create({
        data: input,
        select: { id: true, name: true, slug: true, isActive: true },
      });
    } catch (error) {
      if (isConstraintViolation(error, PG_ERROR.UNIQUE_VIOLATION, 'properties_slug_key')) {
        throw new SlugTakenError(input.slug);
      }
      throw error;
    }
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
          _count: { select: { rooms: { where: { deletedAt: null } } } },
        },
      }),
      this.db.property.count({ where }),
    ]);

    return {
      items: rows.map(({ _count, ...row }) => ({ ...row, roomsCount: _count.rooms })),
      total,
    };
  }
}
