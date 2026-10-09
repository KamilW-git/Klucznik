import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { setupApiClient } from '@/api/client';
import { sessionStore } from '@/api/session-store';

import { TEST_API_URL } from './msw/handlers/auth';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  sessionStore.reset();
  // Ta sama konfiguracja klienta co w aplikacji, z pełnym adresem API (MSW w Node).
  vi.stubEnv('VITE_API_BASE_URL', TEST_API_URL);
  setupApiClient();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());
