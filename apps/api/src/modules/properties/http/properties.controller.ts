import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ValidationFailedException } from '../../../common/errors/validation';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { PropertiesService } from '../application/properties.service';
import {
  CreatePropertyDto,
  DashboardDto,
  ListPropertiesQuery,
  PropertyDto,
  PropertyListDto,
  toPropertyDto,
  UpdatePropertyDto,
} from './property.dto';

/** Obiekty i pulpit (docs/features/properties.md). Cudzy obiekt → 404 (BR-12). */
@ApiTags('properties')
@ApiBearerAuth()
@Roles('OWNER', 'ADMIN')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obiekty: własne (OWNER) albo wszystkie (ADMIN)',
    operationId: 'Properties_list',
  })
  @ApiOkResponse({ type: PropertyListDto })
  async list(
    @Query() query: ListPropertiesQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<PropertyListDto> {
    return { data: await this.properties.list(scopeOf(user), query.ownerId) };
  }

  @Post()
  @ApiOperation({ summary: 'Zakłada obiekt', operationId: 'Properties_create' })
  @ApiCreatedResponse({
    type: PropertyDto,
    description: 'Nagłówek `Location: /api/v1/properties/:id`',
  })
  @ApiNotFoundResponse({ description: 'Nieznany właściciel (`ownerId`)', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'SLUG_TAKEN', type: ErrorResponseDto })
  async create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PropertyDto> {
    const { ownerId, ...input } = dto;
    const property = await this.properties.create(this.resolveOwner(user, ownerId), input);
    setLocation(res, 'properties', property.id);
    return toPropertyDto(property);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Szczegóły obiektu ze zdjęciami', operationId: 'Properties_get' })
  @ApiOkResponse({ type: PropertyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PropertyDto> {
    return toPropertyDto(await this.properties.get(id, scopeOf(user)));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edycja ustawień obiektu', operationId: 'Properties_update' })
  @ApiOkResponse({ type: PropertyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'SLUG_TAKEN, HAS_FUTURE_RESERVATIONS (BR-10)',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PropertyDto> {
    return toPropertyDto(await this.properties.update(id, scopeOf(user), dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Usuwa obiekt (soft delete)', operationId: 'Properties_remove' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'HAS_FUTURE_RESERVATIONS (BR-10)', type: ErrorResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.properties.delete(id, scopeOf(user));
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Pulpit obiektu na dziś (Q-08)', operationId: 'Properties_dashboard' })
  @ApiOkResponse({ type: DashboardDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  dashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DashboardDto> {
    return this.properties.dashboard(id, scopeOf(user));
  }

  /** `OWNER` zakłada obiekt dla siebie; `ADMIN` musi wskazać właściciela. */
  private resolveOwner(user: AuthUser, ownerId: string | undefined): string {
    if (user.role === 'ADMIN') {
      if (!ownerId) {
        throw new ValidationFailedException([
          { field: 'ownerId', messages: ['ownerId is required for ADMIN'] },
        ]);
      }
      return ownerId;
    }
    if (ownerId && ownerId !== user.id) {
      throw new ForbiddenException();
    }
    return user.id;
  }
}
