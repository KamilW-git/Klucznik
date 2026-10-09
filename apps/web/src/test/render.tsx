import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createQueryClient } from '@/app/query-client';
import { appRoutes } from '@/app/router';
import { AuthProvider } from '@/features/auth';

function createTestQueryClient() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  return client;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

/** Cała aplikacja (trasy, ochrona, layouty) w routerze w pamięci, start pod `path`. */
export function renderApp(path: string, routes: RouteObject[] = appRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...result, router };
}

/** Pojedynczy komponent z providerami (bez routera aplikacji). */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
