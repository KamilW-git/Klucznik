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
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { RoomsService } from '../application/rooms.service';
import {
  CreateRoomDto,
  ListRoomsQuery,
  RoomDto,
  RoomListDto,
  toRoomDto,
  UpdateRoomDto,
} from './room.dto';

/** Pokoje (docs/features/rooms.md). Cudzy obiekt lub pokój → 404 (BR-12). */
@ApiTags('rooms')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get('properties/:propertyId/rooms')
  @ApiOperation({
    summary: 'Pokoje obiektu (bez usuniętych, sort po nazwie)',
    operationId: 'Rooms_list',
  })
  @ApiOkResponse({ type: RoomListDto })
  async list(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() query: ListRoomsQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomListDto> {
    const rooms = await this.rooms.list(propertyId, scopeOf(user), query.includeInactive);
    return { data: rooms.map(toRoomDto) };
  }

  @Post('properties/:propertyId/rooms')
  @ApiOperation({ summary: 'Dodaje pokój do obiektu', operationId: 'Rooms_create' })
  @ApiCreatedResponse({ type: RoomDto, description: 'Nagłówek `Location: /api/v1/rooms/:id`' })
  async create(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RoomDto> {
    const room = await this.rooms.create(propertyId, scopeOf(user), {
      name: dto.name,
      description: dto.description ?? null,
      capacity: dto.capacity,
      basePricePerNight: dto.basePricePerNight,
      minNights: dto.minNights ?? 1,
      isActive: dto.isActive ?? true,
    });
    setLocation(res, 'rooms', room.id);
    return toRoomDto(room);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Szczegóły pokoju', operationId: 'Rooms_get' })
  @ApiOkResponse({ type: RoomDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDto> {
    return toRoomDto(await this.rooms.get(id, scopeOf(user)));
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Edycja pokoju', operationId: 'Rooms_update' })
  @ApiOkResponse({ type: RoomDto })
  @ApiConflictResponse({
    description: 'HAS_FUTURE_RESERVATIONS przy `isActive: false` (BR-10)',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDto> {
    return toRoomDto(await this.rooms.update(id, scopeOf(user), dto));
  }

  @Delete('rooms/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Usuwa pokój (soft delete, historia rezerwacji zostaje)',
    operationId: 'Rooms_remove',
  })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'HAS_FUTURE_RESERVATIONS (BR-10)', type: ErrorResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.rooms.delete(id, scopeOf(user));
  }
}
