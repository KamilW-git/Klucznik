import type { AuthResponseDto, MeDto } from '@klucznik/api-client';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

/** Dlaczego sesja się skończyła: `logout` (użytkownik) nie dopisuje `?next=` przy przekierowaniu. */
export type SessionEndReason = 'logout' | 'expired';

export interface SessionState {
  status: SessionStatus;
  user: MeDto | null;
  endReason: SessionEndReason | null;
}

type Listener = () => void;

const INITIAL: SessionState = { status: 'loading', user: null, endReason: null };

/**
 * Sesja w pamięci modułu. Access token **nie** trafia do `localStorage` ani `sessionStorage`
 * (security.md); po przeładowaniu strony sesję odzyskuje `POST /auth/refresh` (cookie `HttpOnly`).
 */
function createSessionStore() {
  let state: SessionState = INITIAL;
  let accessToken: string | null = null;
  const listeners = new Set<Listener>();

  function set(next: SessionState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getState: (): SessionState => state,
    getAccessToken: (): string | null => accessToken,
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    signIn: (auth: AuthResponseDto): void => {
      accessToken = auth.accessToken;
      set({ status: 'authenticated', user: auth.user, endReason: null });
    },
    signOut: (reason: SessionEndReason = 'expired'): void => {
      accessToken = null;
      // Już bez sesji: zachowaj pierwotny powód (np. kolejne 401 po wylogowaniu).
      if (state.status === 'anonymous') return;
      // Start aplikacji bez sesji to nie „wygaśnięcie”: brak powodu.
      set({
        status: 'anonymous',
        user: null,
        endReason: state.status === 'loading' ? null : reason,
      });
    },
    /** Tylko testy: powrót do stanu startowego. */
    reset: (): void => {
      accessToken = null;
      set(INITIAL);
    },
  };
}

export const sessionStore = createSessionStore();
