/**
 * Dane demo (apps/api/docs/persistence-layer.md#seed), spójne z ekranami Stitch
 * (docs/prompts/02-prompty-stitch.md). Daty rezerwacji są przesunięciami względem „dziś”.
 */

export interface SeasonDef {
  name: string;
  /** `MM-DD`, pierwsza noc (włącznie). */
  from: string;
  /** `MM-DD`, ostatnia noc (włącznie); wcześniejsza niż `from` oznacza przełom roku. */
  to: string;
  minNights?: number;
}

export const SEASONS = {
  high: { name: 'Wysoki sezon', from: '07-01', to: '08-31', minNights: 3 },
  may: { name: 'Majówka', from: '05-01', to: '05-03' },
  newYear: { name: 'Sylwester', from: '12-30', to: '01-01' },
} satisfies Record<string, SeasonDef>;

export type SeasonKey = keyof typeof SEASONS;

export interface RoomDef {
  name: string;
  description: string;
  capacity: number;
  /** Grosze. */
  basePricePerNight: number;
  /** Ceny sezonowe w groszach. */
  seasonalPrices: Partial<Record<SeasonKey, number>>;
}

export interface GuestDef {
  key: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface ReservationDef {
  /** Ostatni segment numeru `KL-RRRR-NNNNNN`. */
  seq: number;
  room: string;
  guest: string;
  /** Przesunięcie przyjazdu względem dziś (dni). */
  checkInOffset: number;
  nights: number;
  guestsCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
  source: 'ONLINE' | 'MANUAL';
  /** Dla `PENDING`/`EXPIRED`: `expiresAt` = teraz + tyle godzin (ujemne = w przeszłości). */
  expiresInHours?: number;
  guestNotes?: string;
  internalNotes?: string;
}

export interface PropertyDef {
  name: string;
  slug: string;
  description: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  contactEmail: string;
  rooms: RoomDef[];
  /** Blokada „Remont” na pokoju (przesunięcia względem dziś, noce włącznie). */
  block?: { room: string; fromOffset: number; toOffset: number; reason: string };
  guests: GuestDef[];
  reservations: ReservationDef[];
}

export interface OwnerDef {
  email: string;
  firstName: string;
  lastName: string;
  property: PropertyDef;
}

const zl = (value: number): number => value * 100;

export const MAIN_OWNER: OwnerDef = {
  email: 'jan.nowak@example.com',
  firstName: 'Jan',
  lastName: 'Nowak',
  property: {
    name: 'Domki Leśna Polana',
    slug: 'lesna-polana',
    description:
      'Drewniane domki nad jeziorem na Mazurach, w otoczeniu sosnowego lasu. Cisza, pomost i ognisko.',
    street: 'Leśna 12',
    postalCode: '11-730',
    city: 'Mikołajki',
    phone: '+48 600 100 200',
    contactEmail: 'kontakt@lesnapolana.example.com',
    rooms: [
      {
        name: 'Domek Sosna',
        description: 'Domek z tarasem i widokiem na las, dwie sypialnie.',
        capacity: 4,
        basePricePerNight: zl(370),
        seasonalPrices: { high: zl(450), may: zl(420), newYear: zl(550) },
      },
      {
        name: 'Domek Brzoza',
        description: 'Największy domek z kominkiem, trzy sypialnie.',
        capacity: 6,
        basePricePerNight: zl(520),
        seasonalPrices: { high: zl(650), may: zl(600), newYear: zl(750) },
      },
      {
        name: 'Pokój Jeziorny',
        description: 'Pokój dla dwojga z balkonem od strony jeziora.',
        capacity: 2,
        basePricePerNight: zl(240),
        seasonalPrices: { high: zl(290), newYear: zl(350) },
      },
      {
        name: 'Apartament Pod Dębem',
        description: 'Apartament z aneksem kuchennym na parterze głównego budynku.',
        capacity: 4,
        basePricePerNight: zl(380),
        seasonalPrices: { high: zl(460), may: zl(430), newYear: zl(560) },
      },
    ],
    block: { room: 'Pokój Jeziorny', fromOffset: 10, toOffset: 12, reason: 'Remont' },
    guests: [
      {
        key: 'anna',
        firstName: 'Anna',
        lastName: 'Kowalska',
        email: 'anna.kowalska@example.com',
        phone: '+48 501 234 567',
      },
      {
        key: 'piotr',
        firstName: 'Piotr',
        lastName: 'Zieliński',
        email: 'piotr.zielinski@example.com',
        phone: '+48 502 345 678',
      },
      {
        key: 'katarzyna',
        firstName: 'Katarzyna',
        lastName: 'Wójcik',
        email: 'katarzyna.wojcik@example.com',
        phone: null,
      },
      {
        key: 'marek',
        firstName: 'Marek',
        lastName: 'Kamiński',
        email: 'marek.kaminski@example.com',
        phone: '+48 503 456 789',
      },
      // Rezerwacja telefoniczna bez e-maila (Q-03).
      {
        key: 'tomasz',
        firstName: 'Tomasz',
        lastName: 'Lewandowski',
        email: null,
        phone: '+48 504 567 890',
      },
    ],
    reservations: [
      // Oczekująca online, wygasa za ~21 h (pulpit O2: „Oczekujące”).
      {
        seq: 101,
        room: 'Domek Sosna',
        guest: 'anna',
        checkInOffset: 14,
        nights: 4,
        guestsCount: 3,
        status: 'PENDING',
        source: 'ONLINE',
        expiresInHours: 21,
        guestNotes: 'Przyjedziemy około 17:00.',
      },
      // Przyjazd dziś.
      {
        seq: 102,
        room: 'Domek Brzoza',
        guest: 'tomasz',
        checkInOffset: 0,
        nights: 3,
        guestsCount: 5,
        status: 'CONFIRMED',
        source: 'MANUAL',
        internalNotes: 'Rezerwacja telefoniczna, płatność na miejscu.',
      },
      // Wyjazd dziś.
      {
        seq: 103,
        room: 'Domek Sosna',
        guest: 'piotr',
        checkInOffset: -3,
        nights: 3,
        guestsCount: 2,
        status: 'CONFIRMED',
        source: 'ONLINE',
      },
      // Potwierdzona w przyszłości.
      {
        seq: 104,
        room: 'Apartament Pod Dębem',
        guest: 'katarzyna',
        checkInOffset: 5,
        nights: 3,
        guestsCount: 4,
        status: 'CONFIRMED',
        source: 'ONLINE',
      },
      // Anulowana przez gościa (termin wolny).
      {
        seq: 105,
        room: 'Pokój Jeziorny',
        guest: 'marek',
        checkInOffset: 20,
        nights: 2,
        guestsCount: 2,
        status: 'CANCELLED',
        source: 'ONLINE',
      },
      // Wygasła (BR-07), termin wolny.
      {
        seq: 106,
        room: 'Pokój Jeziorny',
        guest: 'piotr',
        checkInOffset: 3,
        nights: 2,
        guestsCount: 2,
        status: 'EXPIRED',
        source: 'ONLINE',
        expiresInHours: -2,
      },
      // Zakończona.
      {
        seq: 107,
        room: 'Domek Brzoza',
        guest: 'anna',
        checkInOffset: -20,
        nights: 4,
        guestsCount: 4,
        status: 'COMPLETED',
        source: 'ONLINE',
      },
      // Druga oczekująca, ręcznie wpisana uwaga gospodarza.
      {
        seq: 108,
        room: 'Apartament Pod Dębem',
        guest: 'marek',
        checkInOffset: 30,
        nights: 3,
        guestsCount: 2,
        status: 'PENDING',
        source: 'ONLINE',
        expiresInHours: 40,
      },
    ],
  },
};

/** Drugi właściciel do demonstracji izolacji danych (BR-12). */
export const SECOND_OWNER: OwnerDef = {
  email: 'ewa.wisniewska@example.com',
  firstName: 'Ewa',
  lastName: 'Wiśniewska',
  property: {
    name: 'Pensjonat Pod Lipami',
    slug: 'pod-lipami',
    description: 'Rodzinny pensjonat w Kazimierzu Dolnym, blisko rynku.',
    street: 'Lipowa 3',
    postalCode: '24-120',
    city: 'Kazimierz Dolny',
    phone: '+48 600 300 400',
    contactEmail: 'recepcja@podlipami.example.com',
    rooms: [
      {
        name: 'Pokój Lipowy',
        description: 'Pokój dwuosobowy z widokiem na ogród.',
        capacity: 2,
        basePricePerNight: zl(260),
        seasonalPrices: { high: zl(310) },
      },
    ],
    guests: [
      {
        key: 'jakub',
        firstName: 'Jakub',
        lastName: 'Mazur',
        email: 'jakub.mazur@example.com',
        phone: null,
      },
    ],
    reservations: [
      {
        seq: 109,
        room: 'Pokój Lipowy',
        guest: 'jakub',
        checkInOffset: 7,
        nights: 2,
        guestsCount: 2,
        status: 'CONFIRMED',
        source: 'ONLINE',
      },
    ],
  },
};

/** Numery rezerwacji demo: `KL-<rok>-000101` … `000109`. */
export const DEMO_SEQ_MAX = 109;
