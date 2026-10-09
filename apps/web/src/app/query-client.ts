import { isApiError } from '@klucznik/api-client';
import { QueryClient } from '@tanstack/react-query';

/** Ustawienia z data-and-auth.md#tanstack-query; strona publiczna nadpisuje `staleTime` w M12. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // 1 ponowienie, ale nie dla błędów 4xx (to nie są błędy przejściowe).
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 1,
      },
      mutations: { retry: 0 },
    },
  });
}
