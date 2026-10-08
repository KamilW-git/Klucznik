import { Controller, Get, Inject, Param, Res, StreamableFile } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../../../common/auth/public.decorator';
import { NotFoundError } from '../../../common/errors/not-found.error';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { isValidStorageKey, STORAGE, type Storage } from '../../../common/storage/storage';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Publiczne serwowanie plików (zdjęcia na stronie obiektu). */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  @Get(':storageKey')
  @Public()
  @ApiOperation({ summary: 'Plik zdjęcia', operationId: 'Files_get' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({
    description: 'Nieznany plik albo zły format klucza',
    type: ErrorResponseDto,
  })
  async get(
    @Param('storageKey') storageKey: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Format klucza sprawdzamy przed dostępem do dysku (path traversal → 404).
    if (!isValidStorageKey(storageKey)) {
      throw new NotFoundError('File', storageKey);
    }
    const { stream, size } = await this.storage.get(storageKey);
    // Klucz jest unikalny i niezmienny (nowy plik = nowy klucz), więc cache może być „na zawsze”.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(stream, {
      type: CONTENT_TYPES[storageKey.split('.').pop()!],
      length: size,
    });
  }
}
