import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

import { scopeOf } from '../../../common/access/access-scope';
import type { AuthUser } from '../../../common/auth/auth-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Roles } from '../../../common/auth/roles.decorator';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { ValidationFailedException } from '../../../common/errors/validation';
import {
  PhotosService,
  type UploadedFile as UploadedFileInput,
  type UploadTarget,
} from '../application/photos.service';
import { PhotoDto, toPhotoDto, UpdatePhotoDto, UploadPhotoDto } from './photo.dto';

const UPLOAD_SCHEMA = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary', description: 'JPG, PNG lub WebP, maks. 10 MB' },
      altText: { type: 'string', maxLength: 300 },
    },
  },
};

/** Zdjęcia obiektów i pokoi (docs/features/photos.md). Cudzy zasób → 404 (BR-12). */
@ApiTags('photos')
@ApiBearerAuth()
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Roles('OWNER', 'ADMIN')
@Controller()
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('properties/:id/photos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Dodaje zdjęcie obiektu (na koniec galerii)',
    operationId: 'Photos_uploadForProperty',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(UPLOAD_SCHEMA)
  @ApiCreatedResponse({ type: PhotoDto })
  @ApiPayloadTooLargeResponse({ description: 'FILE_TOO_LARGE', type: ErrorResponseDto })
  @ApiUnsupportedMediaTypeResponse({ description: 'UNSUPPORTED_FILE_TYPE', type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'PHOTO_LIMIT_REACHED', type: ErrorResponseDto })
  uploadForProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileInput | undefined,
    @Body() dto: UploadPhotoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoDto> {
    return this.upload({ propertyId: id }, file, dto, user);
  }

  @Post('rooms/:id/photos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Dodaje zdjęcie pokoju (na koniec galerii)',
    operationId: 'Photos_uploadForRoom',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(UPLOAD_SCHEMA)
  @ApiCreatedResponse({ type: PhotoDto })
  @ApiPayloadTooLargeResponse({ description: 'FILE_TOO_LARGE', type: ErrorResponseDto })
  @ApiUnsupportedMediaTypeResponse({ description: 'UNSUPPORTED_FILE_TYPE', type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'PHOTO_LIMIT_REACHED', type: ErrorResponseDto })
  uploadForRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileInput | undefined,
    @Body() dto: UploadPhotoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoDto> {
    return this.upload({ roomId: id }, file, dto, user);
  }

  @Patch('photos/:id')
  @ApiOperation({
    summary: 'Zmienia opis lub pozycję zdjęcia (przenumerowanie galerii)',
    operationId: 'Photos_update',
  })
  @ApiOkResponse({ type: PhotoDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhotoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoDto> {
    return toPhotoDto(await this.photos.update(id, scopeOf(user), dto));
  }

  @Delete('photos/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Usuwa zdjęcie i jego plik', operationId: 'Photos_remove' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.photos.delete(id, scopeOf(user));
  }

  private async upload(
    target: UploadTarget,
    file: UploadedFileInput | undefined,
    dto: UploadPhotoDto,
    user: AuthUser,
  ): Promise<PhotoDto> {
    if (!file) {
      throw new ValidationFailedException([{ field: 'file', messages: ['file is required'] }]);
    }
    const photo = await this.photos.upload(target, scopeOf(user), file, dto.altText ?? null);
    return toPhotoDto(photo);
  }
}
