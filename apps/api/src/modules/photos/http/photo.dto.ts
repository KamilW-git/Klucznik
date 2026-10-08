import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

import { API_PREFIX } from '../../../app.setup';
import type { Photo } from '../application/ports';

export class PhotoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Adres pliku',
    example: '/api/v1/files/6f0c2a7e-4c1b-4a8e-9a43-1d6f5f1c2b3a.jpg',
  })
  url: string;

  @ApiProperty({ type: String, nullable: true, example: 'Taras z widokiem na las' })
  altText: string | null;

  @ApiProperty({ description: 'Pozycja w galerii; 0 = zdjęcie główne', example: 0 })
  sortOrder: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: '`null` = zdjęcie obiektu',
  })
  roomId: string | null;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  mimeType: string;

  @ApiProperty({ example: 524288 })
  sizeBytes: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}

export function toPhotoDto(photo: Photo): PhotoDto {
  return {
    id: photo.id,
    url: `/${API_PREFIX}/files/${photo.storageKey}`,
    altText: photo.altText,
    sortOrder: photo.sortOrder,
    roomId: photo.roomId,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    createdAt: photo.createdAt,
  };
}

/** Pola tekstowe żądania `multipart/form-data` (plik w polu `file`). */
export class UploadPhotoDto {
  @ApiPropertyOptional({ description: 'Opis zdjęcia (alt)', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;
}

export class UpdatePhotoDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Opis zdjęcia; `null` usuwa',
    maxLength: 300,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  altText?: string | null;

  @ApiPropertyOptional({
    description: 'Nowa pozycja (0 = zdjęcie główne); pozostałe są przenumerowane',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
