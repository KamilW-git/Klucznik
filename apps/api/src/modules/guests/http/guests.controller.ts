import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { scopeOf } from '../../../common/access/access-scope';
import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { GuestsService } from '../application/guests.service';
import { GuestPageDto, ListGuestsQuery } from './guest.dto';

/** Goście obiektu (docs/features/guests.md). Cudzy obiekt → 404 (BR-12). */
@ApiTags('guests')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}

  @Get('properties/:propertyId/guests')
  @ApiOperation({
    summary: 'Goście obiektu z wyszukiwaniem i paginacją',
    operationId: 'Guests_list',
  })
  @ApiOkResponse({ type: GuestPageDto })
  list(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() query: ListGuestsQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<GuestPageDto> {
    return this.guests.list(propertyId, scopeOf(user), query);
  }
}
