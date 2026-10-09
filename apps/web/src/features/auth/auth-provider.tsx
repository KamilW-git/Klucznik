import { authLogout, refreshAccessToken, type AuthResponseDto } from '@klucznik/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import { sessionStore } from '@/api/session-store';

import { AuthContext } from './auth-context';

const AUTH_CHANNEL = 'kl-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const state = useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);

  // Bootstrap: odzyskanie sesji z ciasteczka `kl_refresh` (single-flight w mutatorze).
  useEffect(() => {
    if (sessionStore.getState().status !== 'loading') return;
    void refreshAccessToken().then((token) => {
      if (!token) sessionStore.signOut();
    });
  }, []);

  // Wylogowanie w innej karcie wylogowuje także tę.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
      if (event.data === 'logout') {
        sessionStore.signOut('logout');
        queryClient.clear();
      }
    };
    return () => channel.close();
  }, [queryClient]);

  const signIn = useCallback((auth: AuthResponseDto) => sessionStore.signIn(auth), []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // Idempotentne po stronie API; lokalne wylogowanie i tak następuje.
    }
    sessionStore.signOut('logout');
    queryClient.clear();
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage('logout');
      channel.close();
    }
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, signIn, logout }), [state, signIn, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
