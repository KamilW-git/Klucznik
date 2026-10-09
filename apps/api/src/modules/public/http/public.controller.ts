import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../../common/auth/public.decorator';
import { CalendarDate } from '../../../common/domain/calendar-date';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { PublicBookingService } from '../application/public-booking.service';
import {
  AvailabilityResultDto,
  CreatePublicReservationDto,
  PublicAvailabilityQuery,
  PublicCancelReservationDto,
  PublicOccupancyDto,
  PublicOccupancyQuery,
  PublicPropertyDto,
  PublicReservationCreatedDto,
  PublicReservationDto,
  toAvailabilityResultDto,
  toPublicPropertyDto,
  toPublicReservationCreatedDto,
  toPublicReservationDto,
} from './public.dto';

const MINUTE_MS = 60_000;
/** docs/architecture/security.md#rate-limiting: `GET /public/**` 60/min, `POST /public/**` 5/min. */
const READ_LIMIT = { default: { limit: 60, ttl: MINUTE_MS } };
const WRITE_LIMIT = { default: { limit: 5, ttl: MINUTE_MS } };

/**
 * Strona publiczna obiektu i proces gościa bez konta (docs/features/guest-booking.md).
 * Nieaktywny lub usunięty obiekt, nieznany lub wygasły token → 404.
 */
@ApiTags('public')
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED', type: ErrorResponseDto })
@Public()
@Throttle(READ_LIMIT)
@Controller('public')
export class PublicController {
  constructor(private readonly booking: PublicBookingService) {}

  @Get('properties/:slug')
  @ApiOperation({ summary: 'Strona obiektu z pokojami', operationId: 'Public_getProperty' })
  @ApiOkResponse({ type: PublicPropertyDto })
  async getProperty(@Param('slug') slug: string): Promise<PublicPropertyDto> {
    return toPublicPropertyDto(await this.booking.getProperty(slug));
  }

  @Get('properties/:slug/availability')
  @ApiOperation({
    summary: 'Dostępność i ceny wszystkich aktywnych pokoi w terminie',
    operationId: 'Public_availability',
  })
  @ApiOkResponse({ type: AvailabilityResultDto })
  @ApiUnprocessableEntityResponse({
    description: 'INVALID_STAY_DATES (BR-04)',
    type: ErrorResponseDto,
  })
  async availability(
    @Param('slug') slug: string,
    @Query() query: PublicAvailabilityQuery,
  ): Promise<AvailabilityResultDto> {
    const availability = await this.booking.checkAvailability(slug, {
      checkIn: CalendarDate.parse(query.checkIn),
      checkOut: CalendarDate.parse(query.checkOut),
      guests: query.guests,
    });
    return toAvailabilityResultDto(availability);
  }

  @Get('properties/:slug/occupancy')
  @ApiOperation({
    summary: 'Zajęte noce aktywnych pokoi (mini-kalendarz, Q-17)',
    operationId: 'Public_occupancy',
  })
  @ApiOkResponse({ type: PublicOccupancyDto })
  async occupancy(
    @Param('slug') slug: string,
    @Query() query: PublicOccupancyQuery,
  ): Promise<PublicOccupancyDto> {
    const rooms = await this.booking.occupancy(
      slug,
      CalendarDate.parse(query.from),
      CalendarDate.parse(query.to),
    );
    return {
      from: query.from,
      to: query.to,
      rooms: rooms.map((room) => ({
        roomId: room.roomId,
        occupiedNights: room.occupiedNights.map((night) => night.toString()),
      })),
    };
  }

  /** Bez nagłówka `Location`: adres rezerwacji zawiera sekretny token (wyjątek od konwencji). */
  @Post('properties/:slug/reservations')
  @Throttle(WRITE_LIMIT)
  @ApiOperation({
    summary: 'Prośba o rezerwację (PENDING, link w e-mailu)',
    operationId: 'Public_createReservation',
  })
  @ApiCreatedResponse({ type: PublicReservationCreatedDto })
  @ApiConflictResponse({ description: 'RESERVATION_OVERLAP (BR-01)', type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'CAPACITY_EXCEEDED, MIN_NIGHTS_NOT_MET, INVALID_STAY_DATES, ROOM_NOT_BOOKABLE',
    type: ErrorResponseDto,
  })
  async createReservation(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicReservationDto,
  ): Promise<PublicReservationCreatedDto> {
    const created = await this.booking.createReservation(slug, {
      roomId: dto.roomId,
      checkIn: CalendarDate.parse(dto.checkIn),
      checkOut: CalendarDate.parse(dto.checkOut),
      guestsCount: dto.guestsCount,
      guest: dto.guest,
      guestNotes: dto.guestNotes ?? null,
    });
    return toPublicReservationCreatedDto(created);
  }

  @Get('reservations/:token')
  @ApiOperation({ summary: 'Rezerwacja gościa z linku', operationId: 'Public_getReservation' })
  @ApiOkResponse({ type: PublicReservationDto })
  async getReservation(@Param('token') token: string): Promise<PublicReservationDto> {
    return toPublicReservationDto(await this.booking.getReservation(token));
  }

  @Post('reservations/:token/cancel')
  @HttpCode(200)
  @Throttle(WRITE_LIMIT)
  @ApiOperation({
    summary: 'Anulowanie przez gościa (BR-08)',
    operationId: 'Public_cancelReservation',
  })
  @ApiOkResponse({ type: PublicReservationDto })
  @ApiConflictResponse({ description: 'INVALID_STATUS_TRANSITION (BR-06)', type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'CANCELLATION_DEADLINE_PASSED z `cancellableUntil` (BR-08)',
    type: ErrorResponseDto,
  })
  async cancelReservation(
    @Param('token') token: string,
    @Body() dto: PublicCancelReservationDto,
  ): Promise<PublicReservationDto> {
    return toPublicReservationDto(await this.booking.cancelReservation(token, dto.reason ?? null));
  }
}
