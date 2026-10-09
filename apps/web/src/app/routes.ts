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
    reservation: '/panel/rezerwacje/:id?',
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
    availability: '/o/:slug/dostepnosc',
    booking: '/o/:slug/rezerwacja',
    bookingSent: '/o/:slug/rezerwacja/wyslana',
    reservation: '/r/:token',
  },
} as const;

/** Parametry wyszukiwania pobytu (P2, P3): `checkIn`, `checkOut` (`YYYY-MM-DD`), `guests`. */
export interface StaySearchParams {
  checkIn: string;
  checkOut: string;
  guests: number;
}

function stayQuery(search: StaySearchParams, extra: Record<string, string> = {}): string {
  return new URLSearchParams({
    ...extra,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: String(search.guests),
  }).toString();
}

/** Sekcje strony obiektu P1 (kotwice w nawigacji nagłówka). */
export const PROPERTY_SECTIONS = {
  search: 'termin',
  about: 'o-nas',
  rooms: 'pokoje',
  gallery: 'galeria',
  location: 'lokalizacja',
  contact: 'kontakt',
} as const;
export type PropertySection = (typeof PROPERTY_SECTIONS)[keyof typeof PROPERTY_SECTIONS];

/** Zakładki edycji pokoju O7 (segment `:tab`). */
export const ROOM_TABS = ['informacje', 'zdjecia', 'cennik', 'blokady'] as const;
export type RoomTab = (typeof ROOM_TABS)[number];

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
    roomNew: () => paths.panel.roomNew,
    room: (roomId: string, tab: RoomTab = 'informacje') => `${paths.panel.rooms}/${roomId}/${tab}`,
    guests: () => paths.panel.guests,
    settings: () => paths.panel.settings,
  },
  admin: {
    owners: () => paths.admin.owners,
    properties: () => paths.admin.properties,
    emailLogs: () => paths.admin.emailLogs,
  },
  public: {
    property: (slug: string, section?: PropertySection) =>
      section ? `/o/${slug}#${section}` : `/o/${slug}`,
    availability: (slug: string, search: StaySearchParams) =>
      `/o/${slug}/dostepnosc?${stayQuery(search)}`,
    booking: (slug: string, roomId: string, search: StaySearchParams) =>
      `/o/${slug}/rezerwacja?${stayQuery(search, { roomId })}`,
    bookingSent: (slug: string) => `/o/${slug}/rezerwacja/wyslana`,
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
