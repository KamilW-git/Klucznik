import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../infrastructure/prisma/generated/client';
import { PrismaRepository } from '../../../infrastructure/prisma/prisma.repository';
import type {
  EmailLogListItem,
  EmailLogsFilter,
  EmailLogsRepository,
  EmailStatus,
} from '../application/ports';
import type { EmailTemplate } from '../domain/email-plan';

@Injectable()
export class PrismaEmailLogsRepository extends PrismaRepository implements EmailLogsRepository {
  async createIfAbsent(log: {
    reservationId: string;
    recipient: string;
    template: EmailTemplate;
    idempotencyKey: string;
    createdAt: Date;
  }): Promise<string | null> {
    // `ON CONFLICT DO NOTHING` zamiast łapania P2002: atomowo i bez przerywania transakcji.
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      INSERT INTO email_logs (id, reservation_id, recipient, template, idempotency_key, status, attempts, created_at, updated_at)
      VALUES (${randomUUID()}::uuid, ${log.reservationId}::uuid, ${log.recipient}, ${log.template},
              ${log.idempotencyKey}, 'QUEUED', 0, ${log.createdAt}, ${log.createdAt})
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  }

  async findStatus(id: string): Promise<EmailStatus | null> {
    const row = await this.db.emailLog.findUnique({ where: { id }, select: { status: true } });
    return row?.status ?? null;
  }

  async markSent(id: string, at: Date): Promise<void> {
    await this.db.emailLog.update({
      where: { id },
      data: { status: 'SENT', sentAt: at, attempts: { increment: 1 } },
    });
  }

  async markFailedAttempt(id: string, error: string, final: boolean): Promise<void> {
    await this.db.emailLog.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error,
        ...(final && { status: 'FAILED' }),
      },
    });
  }

  async list(filter: EmailLogsFilter): Promise<{ items: EmailLogListItem[]; total: number }> {
    const where: Prisma.EmailLogWhereInput = {
      status: filter.status,
      ...(filter.q && { recipient: { contains: filter.q, mode: 'insensitive' } }),
      ...((filter.createdFrom || filter.createdTo) && {
        createdAt: { gte: filter.createdFrom, lt: filter.createdTo },
      }),
    };
    const [rows, total] = await Promise.all([
      this.db.emailLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: filter.skip,
        take: filter.take,
        select: {
          id: true,
          recipient: true,
          template: true,
          status: true,
          attempts: true,
          lastError: true,
          sentAt: true,
          createdAt: true,
          reservation: { select: { number: true } },
        },
      }),
      this.db.emailLog.count({ where }),
    ]);
    return {
      items: rows.map(({ reservation, ...row }) => ({
        ...row,
        reservationNumber: reservation?.number ?? null,
      })),
      total,
    };
  }
}
