import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { Roles } from '../../../common/auth/roles.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { Paginated, PaginationQuery } from '../../../common/http/pagination';
import { ToBoolean, Trim } from '../../../common/http/query-transforms';
import { PropertiesService } from '../application/properties.service';

export class ListAdminPropertiesQuery extends PaginationQuery {
  @ApiPropertyOptional({
    description: 'Szukaj w nazwie i mieście (min. 2 znaki)',
    example: 'Mazury',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  q?: string;

  @ApiPropertyOptional({ description: 'Tylko obiekty tego właściciela', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filtr aktywności obiektu' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminPropertyOwnerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Jan' })
  firstName: string;

  @ApiProperty({ example: 'Nowak' })
  lastName: string;

  @ApiProperty({ example: 'jan.nowak@example.com' })
  email: string;
}

export class AdminPropertyListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Domki Leśna Polana' })
  name: string;

  @ApiProperty({ example: 'lesna-polana' })
  slug: string;

  @ApiProperty({ type: String, nullable: true, example: 'Mikołajki' })
  city: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: AdminPropertyOwnerDto })
  owner: AdminPropertyOwnerDto;

  @ApiProperty({ description: 'Liczba pokoi (bez usuniętych)', example: 4 })
  roomsCount: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export class AdminPropertyPageDto extends Paginated(AdminPropertyListItemDto) {}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/properties')
export class AdminPropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @ApiOperation({
    summary: 'Wszystkie obiekty platformy (najnowsze pierwsze)',
    operationId: 'AdminProperties_list',
  })
  @ApiOkResponse({ type: AdminPropertyPageDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'BR-12: rola inna niż ADMIN', type: ErrorResponseDto })
  list(@Query() query: ListAdminPropertiesQuery): Promise<AdminPropertyPageDto> {
    return this.properties.listForAdmin(query);
  }
}
