import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { scopeOf } from '../../../common/access/access-scope';
import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { parseSort } from '../../../common/http/sort';
import type { GuestInput } from '../../guests/application/ports';
import type { ReservationSortField } from '../application/reservation-ports';
import { ReservationsService } from '../application/reservations.service';
import {
  CancelReservationDto,
  CreateManualReservationDto,
  ListReservationsQuery,
  type ReservationGuestInputDto,
  ReservationDto,
  ReservationPageDto,
  toReservationDto,
  UpdateReservationDto,
} from './reservation.dto';

const date = (value: string | undefined): CalendarDate | undefined =>
  value === undefined ? undefined : CalendarDate.parse(value);

function toGuestInput(dto: ReservationGuestInputDto): GuestInput {
  return dto.id !== undefined
    ? { id: dto.id }
    : {
        firstName: dto.firstName!,
        lastName: dto.lastName!,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
      };
}

/** Rezerwacje w panelu (docs/features/reservations.md). Cudza rezerwacja → 404 (BR-12). */
@ApiTags('reservations')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get('reservations')
  @ApiOperation({
    summary: 'Lista rezerwacji z filtrami, wyszukiwaniem i paginacją',
    operationId: 'Reservations_list',
  })
  @ApiOkResponse({ type: ReservationPageDto })
  list(
    @Query() query: ListReservationsQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationPageDto> {
    return this.reservations.list(scopeOf(user), {
      page: query.page,
      pageSize: query.pageSize,
      propertyId: query.propertyId,
      roomId: query.roomId,
      statuses: query.status,
      source: query.source,
      from: date(query.from),
      to: date(query.to),
      q: query.q,
      sort: parseSort<ReservationSortField>(query.sort),
    });
  }

  @Post('properties/:propertyId/reservations')
  @ApiOperation({
    summary: 'Rezerwacja ręczna (od razu potwierdzona)',
    operationId: 'Reservations_createManual',
  })
  @ApiCreatedResponse({
    type: ReservationDto,
    description: 'Nagłówek `Location: /api/v1/reservations/:id`',
  })
  @ApiConflictResponse({ description: 'RESERVATION_OVERLAP (BR-01)', type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'CAPACITY_EXCEEDED, MIN_NIGHTS_NOT_MET, INVALID_STAY_DATES, ROOM_NOT_BOOKABLE',
    type: ErrorResponseDto,
  })
  async createManual(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateManualReservationDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReservationDto> {
    const reservation = await this.reservations.createManual(propertyId, scopeOf(user), {
      roomId: dto.roomId,
      checkIn: CalendarDate.parse(dto.checkIn),
      checkOut: CalendarDate.parse(dto.checkOut),
      guestsCount: dto.guestsCount,
      guest: toGuestInput(dto.guest),
      guestNotes: dto.guestNotes ?? null,
      internalNotes: dto.internalNotes ?? null,
      ignoreMinNights: dto.ignoreMinNights ?? false,
    });
    setLocation(res, 'reservations', reservation.id);
    return toReservationDto(reservation);
  }

  @Get('reservations/:id')
  @ApiOperation({ summary: 'Szczegóły rezerwacji z historią', operationId: 'Reservations_get' })
  @ApiOkResponse({ type: ReservationDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDto> {
    return toReservationDto(await this.reservations.get(id, scopeOf(user)));
  }

  @Patch('reservations/:id')
  @ApiOperation({
    summary: 'Edycja rezerwacji (optimistic locking, Q-02)',
    operationId: 'Reservations_update',
  })
  @ApiOkResponse({ type: ReservationDto })
  @ApiConflictResponse({
    description: 'VERSION_CONFLICT (BR-11), RESERVATION_OVERLAP (BR-01), RESERVATION_NOT_EDITABLE',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'CAPACITY_EXCEEDED, MIN_NIGHTS_NOT_MET, INVALID_STAY_DATES, ROOM_NOT_BOOKABLE',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDto> {
    const reservation = await this.reservations.update(id, scopeOf(user), {
      ...dto,
      checkIn: date(dto.checkIn),
      checkOut: date(dto.checkOut),
    });
    return toReservationDto(reservation);
  }

  @Post('reservations/:id/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Potwierdza rezerwację oczekującą',
    operationId: 'Reservations_confirm',
  })
  @ApiOkResponse({ type: ReservationDto })
  @ApiConflictResponse({
    description: 'INVALID_STATUS_TRANSITION (BR-06, także po wygaśnięciu: BR-07)',
    type: ErrorResponseDto,
  })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDto> {
    return toReservationDto(await this.reservations.confirm(id, scopeOf(user)));
  }

  @Post('reservations/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Anuluje rezerwację (dla PENDING: odrzuca)',
    operationId: 'Reservations_cancel',
  })
  @ApiOkResponse({ type: ReservationDto })
  @ApiConflictResponse({ description: 'INVALID_STATUS_TRANSITION (BR-06)', type: ErrorResponseDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDto> {
    const reservation = await this.reservations.cancel(id, scopeOf(user), dto.reason ?? null);
    return toReservationDto(reservation);
  }
}
