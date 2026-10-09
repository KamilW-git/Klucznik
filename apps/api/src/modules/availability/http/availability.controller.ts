import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { scopeOf } from '../../../common/access/access-scope';
import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { AvailabilityService } from '../application/availability.service';
import { CalendarService } from '../application/calendar.service';
import { CalendarDto, CalendarQuery, toCalendarDto } from './calendar.dto';
import { RoomQuoteDto, RoomQuoteQuery, toRoomQuoteDto } from './quote.dto';

/** Wycena pokoju i kalendarz obłożenia (docs/features/availability.md). Cudzy zasób → 404 (BR-12). */
@ApiTags('availability')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class AvailabilityController {
  constructor(
    private readonly availability: AvailabilityService,
    private readonly calendar: CalendarService,
  ) {}

  @Get('rooms/:id/quote')
  @ApiOperation({
    summary: 'Dostępność i cena pobytu w pokoju (rezerwacja ręczna, Q-17)',
    operationId: 'Availability_quote',
  })
  @ApiOkResponse({ type: RoomQuoteDto })
  @ApiUnprocessableEntityResponse({
    description: 'INVALID_STAY_DATES (BR-04, przyjazd do 30 dni wstecz: Q-01)',
    type: ErrorResponseDto,
  })
  async quote(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RoomQuoteQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomQuoteDto> {
    const quote = await this.availability.quote(id, scopeOf(user), {
      checkIn: CalendarDate.parse(query.checkIn),
      checkOut: CalendarDate.parse(query.checkOut),
      guests: query.guests,
      excludeReservationId: query.excludeReservationId,
    });
    return toRoomQuoteDto(quote);
  }

  @Get('properties/:propertyId/calendar')
  @ApiOperation({
    summary: 'Kalendarz obłożenia: pokoje, rezerwacje i blokady w zakresie dni',
    operationId: 'Availability_calendar',
  })
  @ApiOkResponse({ type: CalendarDto })
  async getCalendar(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() query: CalendarQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<CalendarDto> {
    const calendar = await this.calendar.get(
      propertyId,
      scopeOf(user),
      CalendarDate.parse(query.from),
      CalendarDate.parse(query.to),
    );
    return toCalendarDto(query.from, query.to, calendar);
  }
}
