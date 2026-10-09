import { Inject, Injectable } from '@nestjs/common';

import type { CalendarDate } from '../../../common/domain/calendar-date';
import { startOfDayInZone } from '../../../common/domain/time-zone';
import {
  type Paginated,
  paginate,
  type PaginationQuery,
  toSkipTake,
} from '../../../common/http/pagination';
import { type AppConfig, appConfig } from '../../../config/app.config';
import {
  EMAIL_LOGS_REPOSITORY,
  type EmailLogListItem,
  type EmailLogsRepository,
  type EmailStatus,
} from './ports';

export interface ListEmailLogsInput extends PaginationQuery {
  status?: EmailStatus;
  q?: string;
  /** Dni `createdAt` w strefie aplikacji, włącznie. */
  from?: CalendarDate;
  to?: CalendarDate;
}

/** Logi e-maili dla admina (Q-07, docs/features/admin-owners.md). */
@Injectable()
export class EmailLogsService {
  constructor(
    @Inject(EMAIL_LOGS_REPOSITORY) private readonly logs: EmailLogsRepository,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  async list(query: ListEmailLogsInput): Promise<Paginated<EmailLogListItem>> {
    const { items, total } = await this.logs.list({
      status: query.status,
      q: query.q,
      createdFrom: query.from && startOfDayInZone(query.from, this.config.timeZone),
      createdTo: query.to && startOfDayInZone(query.to.addDays(1), this.config.timeZone),
      ...toSkipTake(query),
    });
    return paginate(items, query, total);
  }
}
