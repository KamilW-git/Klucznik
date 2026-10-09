import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { DateRangeQuery, toDateRangeFilter } from '../../../common/http/date-fields';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { RatesService } from '../application/rates.service';
import {
  CreateSeasonalRateDto,
  SeasonalRateDto,
  SeasonalRateListDto,
  toSeasonalRateDto,
  UpdateSeasonalRateDto,
} from './rate.dto';

const OVERLAP = {
  description: 'SEASONAL_RATE_OVERLAP z `conflictingRateId`, `conflictingRateName` (BR-09)',
  type: ErrorResponseDto,
};

/** Stawki sezonowe (docs/features/pricing.md). Cudzy pokój lub stawka → 404 (BR-12). */
@ApiTags('pricing')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get('rooms/:roomId/rates')
  @ApiOperation({
    summary: 'Stawki sezonowe pokoju (sort po dateFrom)',
    operationId: 'Rates_list',
  })
  @ApiOkResponse({ type: SeasonalRateListDto })
  async list(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: DateRangeQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<SeasonalRateListDto> {
    const rates = await this.rates.list(roomId, scopeOf(user), toDateRangeFilter(query));
    return { data: rates.map(toSeasonalRateDto) };
  }

  @Post('rooms/:roomId/rates')
  @ApiOperation({ summary: 'Dodaje stawkę sezonową', operationId: 'Rates_create' })
  @ApiCreatedResponse({
    type: SeasonalRateDto,
    description: 'Nagłówek `Location: /api/v1/rates/:id`',
  })
  @ApiConflictResponse(OVERLAP)
  async create(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: CreateSeasonalRateDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SeasonalRateDto> {
    const rate = await this.rates.create(roomId, scopeOf(user), {
      name: dto.name,
      dateFrom: CalendarDate.parse(dto.dateFrom),
      dateTo: CalendarDate.parse(dto.dateTo),
      pricePerNight: dto.pricePerNight,
      minNights: dto.minNights ?? null,
    });
    setLocation(res, 'rates', rate.id);
    return toSeasonalRateDto(rate);
  }

  @Patch('rates/:id')
  @ApiOperation({ summary: 'Edycja stawki sezonowej', operationId: 'Rates_update' })
  @ApiOkResponse({ type: SeasonalRateDto })
  @ApiConflictResponse(OVERLAP)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeasonalRateDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SeasonalRateDto> {
    const { dateFrom, dateTo, ...rest } = dto;
    const rate = await this.rates.update(id, scopeOf(user), {
      ...rest,
      ...(dateFrom !== undefined && { dateFrom: CalendarDate.parse(dateFrom) }),
      ...(dateTo !== undefined && { dateTo: CalendarDate.parse(dateTo) }),
    });
    return toSeasonalRateDto(rate);
  }

  @Delete('rates/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Usuwa stawkę sezonową', operationId: 'Rates_remove' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.rates.delete(id, scopeOf(user));
  }
}
