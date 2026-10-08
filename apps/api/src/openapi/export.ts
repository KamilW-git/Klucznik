import 'reflect-metadata';

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { applyOpenApiExportEnv } from '../config/openapi-export-env';

/** Z `dist/openapi/export.js` do `packages/api-client/openapi.json` w roocie monorepo. */
const OUTPUT_PATH = resolve(__dirname, '../../../../packages/api-client/openapi.json');

/** Klucze obiektów posortowane rekurencyjnie, żeby diff kontraktu w CI był stabilny. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([key, nested]) => [key, sortKeys(nested)]),
    );
  }
  return value;
}

/**
 * Eksport kontraktu OpenAPI bez uruchamiania serwera HTTP (ADR 0006).
 * `preview: true` buduje graf modułów bez tworzenia providerów, więc nie łączy się z bazą ani Redisem.
 */
async function exportOpenApi(): Promise<void> {
  // Walidacja env działa przy imporcie AppModule, dlatego moduły ładujemy dopiero po uzupełnieniu env.
  // `import()` zostaje dynamicznym importem ESM (NodeNext), stąd jawne rozszerzenia `.js`.
  applyOpenApiExportEnv();
  const { AppModule } = await import('../app.module.js');
  const { API_PREFIX } = await import('../app.setup.js');
  const { buildOpenApiDocument } = await import('./swagger.js');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    preview: true,
    // Bez ostrzeżenia o trybie PREVIEW, które Nest wypisuje jako `warn`.
    logger: ['error'],
  });
  app.setGlobalPrefix(API_PREFIX);

  const document = buildOpenApiDocument(app);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(sortKeys(document), null, 2)}\n`, 'utf8');
  await app.close();

  console.log(`OpenAPI zapisany: ${OUTPUT_PATH}`);
}

exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
