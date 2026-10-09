import type { Role } from '@klucznik/api-client';

/**
 * Jedyne miejsce ze ścieżkami UI (architecture.md#routing). Komponenty używają `routes.*`,
 * definicja routera – `paths.*`.
 */
export const paths = {
  login: '/logowanie',
  panel: {
    root: '/panel',
    calendar: '/panel/kalendarz',
    reservations: '/panel/rezerwacje',
    reservation: '/panel/rezerwacje/:id',
    rooms: '/panel/pokoje',
    roomNew: '/panel/pokoje/nowy',
    room: '/panel/pokoje/:roomId/:tab',
    guests: '/panel/goscie',
    settings: '/panel/ustawienia',
  },
  admin: {
    root: '/admin',
    owners: '/admin/wlasciciele',
    properties: '/admin/obiekty',
    emailLogs: '/admin/logi-email',
  },
  public: {
    property: '/o/:slug',
    reservation: '/r/:token',
  },
} as const;

export const routes = {
  root: () => '/',
  login: (next?: string) =>
    next ? `${paths.login}?${new URLSearchParams({ next }).toString()}` : paths.login,
  panel: {
    dashboard: () => paths.panel.root,
    calendar: () => paths.panel.calendar,
    reservations: () => paths.panel.reservations,
    reservation: (id: string) => `${paths.panel.reservations}/${id}`,
    rooms: () => paths.panel.rooms,
    guests: () => paths.panel.guests,
    settings: () => paths.panel.settings,
  },
  admin: {
    owners: () => paths.admin.owners,
    properties: () => paths.admin.properties,
    emailLogs: () => paths.admin.emailLogs,
  },
  public: {
    property: (slug: string) => `/o/${slug}`,
    reservation: (token: string) => `/r/${token}`,
  },
};

/** Panel właściwy dla roli (po zalogowaniu i przy złej roli). */
export function homeFor(role: Role): string {
  return role === 'ADMIN' ? routes.admin.owners() : routes.panel.dashboard();
}

/**
 * `?next=` tylko jako ścieżka wewnętrzna (bez `//host` i schematu), żeby link logowania
 * nie przekierował na obcą stronę.
 */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return null;
  }
  return next;
}
