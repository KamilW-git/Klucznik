import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { scopeOf } from '../../../common/access/access-scope';
import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { InclusiveDateRange } from '../../../common/domain/date-range';
import { DateRangeQuery, toDateRangeFilter } from '../../../common/http/date-fields';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { BlocksService } from '../application/blocks.service';
import {
  AvailabilityBlockDto,
  AvailabilityBlockListDto,
  CreateBlockDto,
  toAvailabilityBlockDto,
} from './block.dto';

/** Blokady terminów (docs/features/availability.md). Cudzy pokój lub blokada → 404 (BR-12). */
@ApiTags('availability')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get('rooms/:roomId/blocks')
  @ApiOperation({
    summary: 'Blokady terminów pokoju (sort po dateFrom)',
    operationId: 'Blocks_list',
  })
  @ApiOkResponse({ type: AvailabilityBlockListDto })
  async list(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: DateRangeQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilityBlockListDto> {
    const blocks = await this.blocks.list(roomId, scopeOf(user), toDateRangeFilter(query));
    return { data: blocks.map(toAvailabilityBlockDto) };
  }

  @Post('rooms/:roomId/blocks')
  @ApiOperation({ summary: 'Blokuje termin pokoju', operationId: 'Blocks_create' })
  @ApiCreatedResponse({
    type: AvailabilityBlockDto,
    description: 'Nagłówek `Location: /api/v1/blocks/:id`',
  })
  @ApiConflictResponse({
    description:
      'BLOCK_OVERLAPS_RESERVATION z `conflictingReservationId`, `conflictingReservationNumber` (BR-01, Q-15)',
    type: ErrorResponseDto,
  })
  async create(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: CreateBlockDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AvailabilityBlockDto> {
    const block = await this.blocks.create(roomId, scopeOf(user), {
      nights: InclusiveDateRange.of(
        CalendarDate.parse(dto.dateFrom),
        CalendarDate.parse(dto.dateTo),
      ),
      reason: dto.reason ?? null,
    });
    setLocation(res, 'blocks', block.id);
    return toAvailabilityBlockDto(block);
  }

  @Delete('blocks/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Usuwa blokadę terminu', operationId: 'Blocks_remove' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.blocks.delete(id, scopeOf(user));
  }
}
