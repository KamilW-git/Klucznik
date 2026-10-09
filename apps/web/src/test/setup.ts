import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { setupApiClient } from '@/api/client';
import { sessionStore } from '@/api/session-store';

import { TEST_API_URL } from './msw/handlers/auth';
import { server } from './msw/server';

// Strony panelu są ładowane leniwie (`lazy`); przy zimnym starcie Vitest import trwa dłużej niż 1 s.
configure({ asyncUtilTimeout: 5000 });

// jsdom nie implementuje API używanych przez Radix (Select, Popover) i cmdk.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
const elementPolyfills = {
  scrollIntoView: () => undefined,
  hasPointerCapture: () => false,
  releasePointerCapture: () => undefined,
};
for (const [name, value] of Object.entries(elementPolyfills)) {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, { value, configurable: true });
  }
}

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
