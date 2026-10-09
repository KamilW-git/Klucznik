import type { AuthResponseDto } from '@klucznik/api-client';
import { createContext, use } from 'react';

import type { SessionState } from '@/api/session-store';

export interface AuthContextValue extends SessionState {
  /** Po udanym `POST /auth/login`. */
  signIn: (auth: AuthResponseDto) => void;
  /** `POST /auth/logout`, czyszczenie cache zapytań i wylogowanie pozostałych kart. */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth() wymaga <AuthProvider>.');
  return context;
}
