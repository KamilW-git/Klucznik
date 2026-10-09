import { authRefresh, configureApiClient } from '@klucznik/api-client';

import { sessionStore } from './session-store';

const REFRESH_LOCK = 'kl-auth-refresh';

/**
 * `POST /auth/refresh` z blokadą między kartami (Web Locks). API rotuje refresh token i traktuje
 * ponowne użycie starego jako kradzież (security.md), więc dwie karty nie mogą odświeżać
 * równocześnie: druga czeka na zamek i wysyła już nowe ciasteczko.
 */
async function refreshSession(): Promise<string | null> {
  const run = async () => {
    try {
      const auth = await authRefresh();
      sessionStore.signIn(auth);
      return auth.accessToken;
    } catch {
      sessionStore.signOut();
      return null;
    }
  };
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(REFRESH_LOCK, run);
  }
  return run();
}

/** Jednorazowa konfiguracja mutatora `@klucznik/api-client` (wywołanie w `main.tsx`). */
export function setupApiClient(): void {
  configureApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
    getAccessToken: sessionStore.getAccessToken,
    refresh: refreshSession,
    onUnauthorized: () => sessionStore.signOut(),
  });
}
