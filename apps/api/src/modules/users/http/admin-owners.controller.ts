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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Roles } from '../../../common/auth/roles.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { setLocation } from '../../../common/http/location';
import { OwnersService } from '../application/owners.service';
import { CreateOwnerDto, ListOwnersQuery, OwnerDto, OwnerPageDto, UpdateOwnerDto } from './dto';

/** Zarządzanie właścicielami (docs/features/admin-owners.md). Tylko `ADMIN` (BR-12: `OWNER` → 403). */
@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ description: 'BR-12: rola inna niż ADMIN', type: ErrorResponseDto })
@Roles('ADMIN')
@Controller('admin/owners')
export class AdminOwnersController {
  constructor(private readonly owners: OwnersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista właścicieli z wyszukiwaniem i paginacją',
    operationId: 'AdminOwners_list',
  })
  @ApiOkResponse({ type: OwnerPageDto })
  list(@Query() query: ListOwnersQuery): Promise<OwnerPageDto> {
    return this.owners.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Zakłada właściciela (opcjonalnie od razu z obiektem)',
    operationId: 'AdminOwners_create',
  })
  @ApiCreatedResponse({
    type: OwnerDto,
    description: 'Nagłówek `Location` wskazuje nowego właściciela',
  })
  @ApiConflictResponse({ description: 'EMAIL_TAKEN, SLUG_TAKEN', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateOwnerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OwnerDto> {
    const owner = await this.owners.create(dto);
    setLocation(res, 'admin/owners', owner.id);
    return owner;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Szczegóły właściciela z listą obiektów',
    operationId: 'AdminOwners_get',
  })
  @ApiOkResponse({ type: OwnerDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<OwnerDto> {
    return this.owners.get(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edycja właściciela; `isActive: false` blokuje konto i unieważnia sesje',
    operationId: 'AdminOwners_update',
  })
  @ApiOkResponse({ type: OwnerDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'EMAIL_TAKEN', type: ErrorResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerDto): Promise<OwnerDto> {
    return this.owners.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Blokuje konto właściciela (dezaktywacja, bez usuwania danych, Q-10)',
    operationId: 'AdminOwners_remove',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.owners.deactivate(id);
  }
}
