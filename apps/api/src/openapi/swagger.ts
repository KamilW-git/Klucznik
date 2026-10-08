import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { ErrorResponseDto } from '../common/http/error-response.dto';
import { PaginationMetaDto } from '../common/http/pagination';

export const SWAGGER_PATH = 'api/docs';

/**
 * Dokument OpenAPI z dekoratorów kontrolerów i DTO (ADR 0006).
 * `operationId` domyślnie `<Controller>_<method>` (np. `Rooms_create`), z niego orval tworzy nazwy hooków.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Klucznik API')
    .setDescription(
      'REST API systemu rezerwacji Klucznik. Konwencje: docs/architecture/api-conventions.md',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
    // Wspólne schematy dostępne dla klienta, zanim użyje ich pierwszy endpoint.
    extraModels: [ErrorResponseDto, PaginationMetaDto],
  });
}

/** Swagger UI pod `/api/docs`, JSON pod `/api/docs-json`. */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, () => buildOpenApiDocument(app));
}
