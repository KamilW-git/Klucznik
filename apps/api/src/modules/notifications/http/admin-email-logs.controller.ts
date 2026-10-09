import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../common/auth/roles.decorator';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { EmailLogsService } from '../application/email-logs.service';
import { EmailLogPageDto, ListEmailLogsQuery } from './email-log.dto';

const optionalDate = (value: string | undefined): CalendarDate | undefined =>
  value === undefined ? undefined : CalendarDate.parse(value);

/** Logi e-maili (A1, Q-07): od najnowszych. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/email-logs')
export class AdminEmailLogsController {
  constructor(private readonly logs: EmailLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Logi wysyłki e-maili', operationId: 'AdminEmailLogs_list' })
  @ApiOkResponse({ type: EmailLogPageDto })
  list(@Query() query: ListEmailLogsQuery): Promise<EmailLogPageDto> {
    return this.logs.list({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      q: query.q,
      from: optionalDate(query.from),
      to: optionalDate(query.to),
    });
  }
}
