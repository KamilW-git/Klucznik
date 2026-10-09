import { defineConfig } from 'orval';

// Generowanie: `pnpm --filter @klucznik/api-client generate`. Wynik w `src/generated` (nie edytować ręcznie).
export default defineConfig({
  klucznik: {
    input: { target: './openapi.json' },
    output: {
      target: './src/generated/endpoints.ts',
      schemas: './src/generated/model',
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      indexFiles: true,
      override: {
        mutator: { path: './src/http/mutator.ts', name: 'customFetch' },
        // Mutator zwraca samo `data` (błędy jako `ApiError`), bez koperty `{ data, status }`.
        fetch: { includeHttpResponseReturnType: false },
        query: { useInfinite: false, signal: true },
      },
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
